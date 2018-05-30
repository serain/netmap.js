import PromisePool from 'es6-promise-pool'

export default class NetMap {
  constructor ({timeout, portTimeout, protocol} = {}) {
    this.timeout = timeout || 1000
    this.portTimeout = portTimeout || 1000
    this.protocol = protocol || 'http'
  }

  pingSweep (hosts, {maxConnections, port} = {}) {
    return new Promise((resolve, reject) => {
      // best estimate for maxConnections based on
      // https://stackoverflow.com/questions/985431/max-parallel-http-connections-in-a-browser
      // which may not be up-to-date or accurate
      maxConnections = maxConnections || (function () {
        if (window.chrome) return 10
        else return 17
      })()

      port = port || (function () {
        // get a random high port
        return Math.floor(Math.random() * 10000) + 10000
      })()

      const results = {
        hosts: []
      }

      this.tcpScan(hosts, [port], {maxConnections: maxConnections})
        .then(tcpResults => {
          results.meta = tcpResults.meta

          for (let i in tcpResults.hosts) {
            const result = {
              host: tcpResults.hosts[i].host,
              delta: tcpResults.hosts[i].ports[0].delta,
              live: false
            }

            if (result.delta < this.timeout) {
              result.live = true
            }

            results.hosts.push(result)
          }

          resolve(results)
        })
    })
  }

  tcpScan (hosts, ports, {portCallback, maxConnections} = {}) {
    return new Promise((resolve, reject) => {
      // best estimate for maxConnections based on
      // https://stackoverflow.com/questions/985431/max-parallel-http-connections-in-a-browser
      // which may not be up-to-date or accurate
      maxConnections = maxConnections || 6
      const self = this
      const results = {
        meta: {
          hosts: hosts,
          ports: ports,
          maxConnections: maxConnections,
          startTime: (new Date()).getTime()
        },
        hosts: (function () {
          const hostsResults = []
          hosts.forEach(function (host) {
            hostsResults.push({
              host: host,
              ports: []
            })
          })
          return hostsResults
        })()
      }

      const pool = new PromisePool(function * () {
        for (let i = 0; i < hosts.length; i++) {
          for (let j = 0; j < ports.length; j++) {
            yield self.checkPort(self, hosts[i], ports[j])
          }
        }
      }, maxConnections)

      pool.addEventListener('fulfilled', (event) => {
        let result = results.hosts.find(function (value) {
          return value.host === event.data.result.host
        })

        result.ports.push({
          port: event.data.result.port,
          delta: event.data.result.delta
        })

        if (portCallback) portCallback(event.data.result)
      })

      pool.start().then(() => {
        results.meta.endTime = (new Date()).getTime()
        results.meta.scanDuration = results.meta.endTime - results.meta.startTime
        resolve(results)
      })
    })
  }

  checkPort (self, host, port) {
    return new Promise((resolve, reject) => {
      const start = (new Date()).getTime()
      let interval

      const img = new Image()
      img.src = self.protocol + '://' + host + ':' + port
      img.onerror = function () {
        let delta = (new Date()).getTime() - start

        if (delta < self.portTimeout) {
          clearInterval(interval)
          img.src = ''
          resolve({
            host: host,
            port: port,
            delta: delta
          })
        }
      }
      img.onload = img.onerror

      interval = setInterval(function () {
        var delta = (new Date()).getTime() - start

        if (delta >= self.timeout) {
          if (!img) return
          img.src = ''
          clearInterval(interval)
          resolve({
            host: host,
            port: port,
            delta: delta
          })
        }
      }, 1)
    })
  }
}
