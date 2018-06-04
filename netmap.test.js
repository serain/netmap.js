import NetMap from './netmap'

test('_checkPort() returns a promise and a result', () => {
  expect.assertions(1)
  const netmap = new NetMap()
  return netmap._checkPort('localhost', 443, {
    timeout: 1
  }).then(result => {
    expect(result).toBeDefined()
  })
})

test('_checkPort() returns a host', () => {
  expect.assertions(1)
  const netmap = new NetMap()
  return netmap._checkPort('localhost', 443, {
    timeout: 1
  }).then(result => {
    expect(result.host).toBeDefined()
  })
})

test('_checkPort() returns a port', () => {
  expect.assertions(1)
  const netmap = new NetMap()
  return netmap._checkPort('localhost', 443, {
    timeout: 1
  }).then(result => {
    expect(result.port).toBeDefined()
  })
})

test('_checkPort() returns a delta', () => {
  expect.assertions(1)
  const netmap = new NetMap()
  return netmap._checkPort('localhost', 443, {
    timeout: 1
  }).then(result => {
    expect(result.delta).toBeDefined()
  })
})

test('_checkPort() timeout parameter works', () => {
  expect.assertions(2)
  const netmap = new NetMap()
  return netmap._checkPort('non-existing-host', 443, {
    timeout: 10
  }).then(result => {
    expect(result.delta).toBeGreaterThanOrEqual(10)
    expect(result.delta).toBeLessThan(20)
  })
})

test('_scan() returns a promise and hosts', () => {
  expect.assertions(1)
  const netmap = new NetMap({timeout: 1})
  return netmap._scan(['localhost'], [443]).then(hosts => {
    expect(hosts).toBeDefined()
  })
})

test('_scan() results contain hosts and ports', () => {
  expect.assertions(2)

  const portResults = jest.fn()
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 443, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 8080, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.2', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.2', port: 443, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.2', port: 8080, delta: 1})

  const netmap = new NetMap({timeout: 1})
  netmap._checkPort = _ => Promise.resolve(portResults())

  return netmap._scan(['192.168.1.1', '192.168.1.2'], [80, 443, 8080])
    .then(hosts => {
      expect(hosts.length).toEqual(2)
      expect(hosts[0].ports.length).toEqual(3)
    })
})

test('_scan() portCallback() is called', () => {
  expect.assertions(1)

  const portResults = jest.fn()
  portResults.mockReturnValue({host: '192.168.1.1', port: 80, delta: 1})

  const netmap = new NetMap({timeout: 1})
  const portCallback = jest.fn()
  netmap._checkPort = _ => Promise.resolve(portResults())

  return netmap._scan(['192.168.1.1', '192.168.1.2'], [80, 443, 8080], {
    portCallback: portCallback
  }).then(hosts => {
    expect(portCallback.mock.calls.length).toEqual(6)
  })
})

test('_scan() - portCallback() result parameter has expected values', () => {
  expect.assertions(2)

  const portResults = jest.fn()
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 443, delta: 1})

  const netmap = new NetMap({timeout: 1})
  const portCallback = jest.fn()
  netmap._checkPort = _ => Promise.resolve(portResults())

  return netmap._scan(['192.168.1.1'], [80, 443], {
    portCallback: portCallback
  }).then(hosts => {
    const desiredResult = {
      host: '192.168.1.1',
      port: expect.any(Number),
      delta: expect.any(Number)
    }
    expect(portCallback.mock.calls[0][0]).toMatchObject(desiredResult)
    expect(portCallback.mock.calls[1][0]).toMatchObject(desiredResult)
  })
})

test('_scan() hosts contain ports with port and delta', () => {
  expect.assertions(2)

  const portResults = jest.fn()
  portResults.mockReturnValue({host: '192.168.1.1', port: 80, delta: 1})

  const netmap = new NetMap({timeout: 1})
  netmap._checkPort = _ => Promise.resolve(portResults())

  return netmap._scan(['192.168.1.1'], [80]).then(hosts => {
    expect(hosts[0].ports[0].port).toBeDefined()
    expect(hosts[0].ports[0].delta).toBeDefined()
  })
})

test('tcpScan() returns a promise and a result', () => {
  expect.assertions(1)
  const netmap = new NetMap({timeout: 1})
  return netmap.tcpScan(['localhost'], [443]).then(results => {
    expect(results).toBeDefined()
  })
})

test('tcpScan() results contain meta, hosts and ports', () => {
  expect.assertions(3)

  const portResults = jest.fn()
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 443, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 8080, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.2', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.2', port: 443, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.2', port: 8080, delta: 1})
  // control port results
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 45000, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.2', port: 45000, delta: 1})

  const netmap = new NetMap({timeout: 1})
  netmap._checkPort = _ => Promise.resolve(portResults())

  return netmap.tcpScan(['192.168.1.1', '192.168.1.2'], [80, 443, 8080], {
    controlPorts: []
  }).then(results => {
    expect(results.meta).toBeDefined()
    expect(results.hosts.length).toEqual(2)
    expect(results.hosts[0].ports.length).toEqual(3)
  })
})

test('tcpScan() meta has default controlPort', () => {
  expect.assertions(1)

  const portResults = jest.fn()
  portResults.mockReturnValue({host: '192.168.1.1', port: 80, delta: 1})

  const netmap = new NetMap({timeout: 1})
  netmap._checkPort = _ => Promise.resolve(portResults())

  return netmap.tcpScan(['192.168.1.1'], [80]).then(results => {
    expect(results.meta.controlPort).toEqual(45000)
  })
})

test('tcpScan() meta has user defined controlPort', () => {
  expect.assertions(1)

  const portResults = jest.fn()
  portResults.mockReturnValue({host: '192.168.1.1', port: 80, delta: 1})

  const netmap = new NetMap({timeout: 1})
  netmap._checkPort = _ => Promise.resolve(portResults())

  return netmap.tcpScan(['192.168.1.1'], [80], {
    controlPort: 10000
  }).then(results => {
    expect(results.meta.controlPort).toEqual(10000)
  })
})

test('tcpScan() hosts contain control value', () => {
  expect.assertions(1)

  const portResults = jest.fn()
  portResults.mockReturnValue({host: '192.168.1.1', port: 80, delta: 1})

  const netmap = new NetMap({timeout: 1})
  netmap._checkPort = _ => Promise.resolve(portResults())

  return netmap.tcpScan(['192.168.1.1'], [80]).then(results => {
    expect(results.hosts[0].control).toBeDefined()
  })
})

test('tcpScan() hosts contain ports with port, delta and open', () => {
  expect.assertions(3)

  const portResults = jest.fn()
  portResults.mockReturnValue({host: '192.168.1.1', port: 80, delta: 1})

  const netmap = new NetMap({timeout: 1})
  netmap._checkPort = _ => Promise.resolve(portResults())

  return netmap.tcpScan(['192.168.1.1'], [80]).then(results => {
    expect(results.hosts[0].ports[0].port).toBeDefined()
    expect(results.hosts[0].ports[0].delta).toBeDefined()
    expect(results.hosts[0].ports[0].open).toBeDefined()
  })
})

test('tcpScan() hosts correctly marks ports as open and closed', () => {
  expect.assertions(2)

  const portResults = jest.fn()
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 443, delta: 10})
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 45000, delta: 10})

  const netmap = new NetMap({timeout: 1})
  netmap._checkPort = _ => Promise.resolve(portResults())

  return netmap.tcpScan(['192.168.1.1'], [80, 443], {
    controlPort: 45000
  }).then(results => {
    for (let i in results.hosts[0].ports) {
      if (results.hosts[0].ports[i].port === 443) {
        expect(results.hosts[0].ports[i].open).toEqual(false)
      } else if (results.hosts[0].ports[i].port === 80) {
        expect(results.hosts[0].ports[i].open).toEqual(true)
      }
    }
  })
})

test('tcpScan() portCallback() is called', () => {
  expect.assertions(1)

  const portResults = jest.fn()
  portResults.mockReturnValue({host: '192.168.1.1', port: 80, delta: 1})

  const netmap = new NetMap({timeout: 1})
  const portCallback = jest.fn()
  netmap._checkPort = _ => Promise.resolve(portResults())

  return netmap.tcpScan(['192.168.1.1'], [80, 443], {
    portCallback: portCallback
  }).then(results => {
    expect(portCallback.mock.calls.length).toEqual(2)
  })
})

test('tcpScan() - portCallback() result parameter has expected values', () => {
  expect.assertions(2)

  const portResults = jest.fn()
  portResults.mockReturnValue({host: '192.168.1.1', port: 80, delta: 1})

  const netmap = new NetMap({timeout: 1})
  const portCallback = jest.fn()
  netmap._checkPort = _ => Promise.resolve(portResults())

  return netmap.tcpScan(['192.168.1.1'], [80, 443], {
    portCallback: portCallback
  }).then(results => {
    const desiredResult = {
      host: '192.168.1.1',
      port: expect.any(Number),
      delta: expect.any(Number)
    }
    expect(portCallback.mock.calls[0][0]).toMatchObject(desiredResult)
    expect(portCallback.mock.calls[1][0]).toMatchObject(desiredResult)
  })
})

test('pingSweep() returns a promise and a result', () => {
  expect.assertions(1)
  const netmap = new NetMap({timeout: 1})
  return netmap.pingSweep(['localhost']).then(results => {
    expect(results).toBeDefined()
  })
})

test('pingSweep() results contain hosts and meta', () => {
  expect.assertions(2)

  const portResults = jest.fn()
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.2', port: 80, delta: 1})

  const netmap = new NetMap({timeout: 1})
  netmap._checkPort = _ => Promise.resolve(portResults())

  return netmap.pingSweep(['192.168.1.1', '192.168.1.2']).then(results => {
    expect(results.hosts).toBeDefined()
    expect(results.meta).toBeDefined()
  })
})

test('pingSweep() meta contains params', () => {
  expect.assertions(1)

  const portResults = jest.fn()
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.2', port: 80, delta: 1})

  const netmap = new NetMap({timeout: 1})
  netmap._checkPort = _ => Promise.resolve(portResults())

  return netmap.pingSweep(['192.168.1.1', '192.168.1.2']).then(results => {
    const desiredMeta = {
      hosts: ['192.168.1.1', '192.168.1.2'],
      ports: [45000],
      maxConnections: /17|10/,
      startTime: expect.any(Number),
      endTime: expect.any(Number),
      scanDuration: expect.any(Number)
    }

    expect(results.meta).toMatchObject(desiredMeta)
  })
})

test('pingSweep() timeout parameter works', () => {
  expect.assertions(2)
  const netmap = new NetMap({
    timeout: 10
  })
  return netmap.pingSweep(['non-existing-host'], 443).then(results => {
    expect(results.meta.scanDuration).toBeGreaterThanOrEqual(10)
    expect(results.meta.scanDuration).toBeLessThan(20)
  })
})

test('pingSweep() default port set to 45000', () => {
  expect.assertions(1)

  const portResults = jest.fn()
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 80, delta: 1})

  const netmap = new NetMap({timeout: 1})
  netmap._checkPort = _ => Promise.resolve(portResults())

  return netmap.pingSweep(['192.168.1.1']).then(results => {
    expect(results.meta.ports).toEqual([45000])
  })
})

test('pingSweep() results hosts contain expected parameters', () => {
  expect.assertions(3)

  const portResults = jest.fn()
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.2', port: 80, delta: 1})

  const netmap = new NetMap({timeout: 1})
  netmap._checkPort = _ => Promise.resolve(portResults())

  return netmap.pingSweep(['192.168.1.1', '192.168.1.2']).then(results => {
    expect(results.hosts[0].host).toBeDefined()
    expect(results.hosts[0].live).toBeDefined()
    expect(results.hosts[0].delta).toBeDefined()
  })
})

test('pingSweep() marks hosts that timeout as !live', () => {
  expect.assertions(1)

  const portResults = jest.fn()
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.2', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.3', port: 80, delta: 20})

  const netmap = new NetMap({timeout: 20})
  netmap._checkPort = _ => Promise.resolve(portResults())

  return netmap.pingSweep(['192.168.1.1', '192.168.1.2', '192.168.1.3']).then(results => {
    const liveHosts = results.hosts.filter(entry => entry.live)
    expect(liveHosts.length).toEqual(2)
  })
})
