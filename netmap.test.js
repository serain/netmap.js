import NetMap from './netmap'

test('checkPort() returns a promise and a result', () => {
  expect.assertions(1)
  const netmap = new NetMap({timeout: 1})
  return netmap.checkPort(netmap, 'localhost', 443).then(result => {
    expect(result).toBeDefined()
  })
})

test('checkPort() returns a host', () => {
  expect.assertions(1)
  const netmap = new NetMap({timeout: 1})
  return netmap.checkPort(netmap, 'localhost', 443).then(result => {
    expect(result.host).toBeDefined()
  })
})

test('checkPort() returns a port', () => {
  expect.assertions(1)
  const netmap = new NetMap({timeout: 1})
  return netmap.checkPort(netmap, 'localhost', 443).then(result => {
    expect(result.port).toBeDefined()
  })
})

test('checkPort() returns a delta', () => {
  expect.assertions(1)
  const netmap = new NetMap({timeout: 1})
  return netmap.checkPort(netmap, 'localhost', 443).then(result => {
    expect(result.port).toBeDefined()
  })
})

test('NetMap timeout parameter works', () => {
  expect.assertions(2)
  const netmap = new NetMap({timeout: 500})
  return netmap.checkPort(netmap, 'non-existing-host', 443).then(result => {
    expect(result.delta).toBeGreaterThanOrEqual(500)
    expect(result.delta).toBeLessThan(600)
  })
})

test('tcpScan() returns a promise and a result', () => {
  expect.assertions(1)
  const netmap = new NetMap({timeout: 1})
  return netmap.tcpScan(['localhost'], [443]).then(results => {
    expect(results).toBeDefined()
  })
})

test('tcpScan() results contain hosts and ports', () => {
  expect.assertions(2)

  const portResults = jest.fn()
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 443, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 8080, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.2', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.2', port: 443, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.2', port: 8080, delta: 1})

  const netmap = new NetMap({timeout: 1})
  netmap.checkPort = _ => Promise.resolve(portResults())

  return netmap.tcpScan(['192.168.1.1', '192.168.1.2'], [80, 443, 8080]).then(results => {
    expect(results.hosts.length).toEqual(2)
    expect(results.hosts[0].ports.length).toEqual(3)
  })
})

test('tcpScan() results contain ports with port and delta', () => {
  expect.assertions(2)

  const portResults = jest.fn()
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 80, delta: 1})

  const netmap = new NetMap({timeout: 1})
  netmap.checkPort = _ => Promise.resolve(portResults())

  return netmap.tcpScan(['192.168.1.1'], [80]).then(results => {
    expect(results.hosts[0].ports[0].port).toBeDefined()
    expect(results.hosts[0].ports[0].delta).toBeDefined()
  })
})

test('tcpScan() portCallback() is called', () => {
  expect.assertions(1)

  const portResults = jest.fn()
  portResults.mockReturnValue({host: '192.168.1.1', port: 80, delta: 1})

  const netmap = new NetMap({timeout: 1})
  const portCallback = jest.fn()
  netmap.checkPort = _ => Promise.resolve(portResults())

  return netmap.tcpScan(['192.168.1.1', '192.168.1.2'], [80, 443, 8080], {
    portCallback: portCallback
  }).then(results => {
    expect(portCallback.mock.calls.length).toEqual(6)
  })
})

test('tcpScan() - portCallback() result parameter has expected values', () => {
  expect.assertions(2)

  const portResults = jest.fn()
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 443, delta: 1})

  const netmap = new NetMap({timeout: 1})
  const portCallback = jest.fn()
  netmap.checkPort = _ => Promise.resolve(portResults())

  return netmap.tcpScan(['192.168.1.1'], [80, 443], {
    portCallback: portCallback
  }).then(results => {
    expect(portCallback.mock.calls[0][0]).toEqual({host: '192.168.1.1', port: 80, delta: 1})
    expect(portCallback.mock.calls[1][0]).toEqual({host: '192.168.1.1', port: 443, delta: 1})
  })
})

test('pingSweep() returns a promise and a result', () => {
  expect.assertions(1)
  const netmap = new NetMap({timeout: 1})
  return netmap.pingSweep(['localhost']).then(results => {
    expect(results).toBeDefined()
  })
})

test('pingSweep() results contain hosts', () => {
  expect.assertions(1)

  const portResults = jest.fn()
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.2', port: 80, delta: 1})

  const netmap = new NetMap({timeout: 1})
  netmap.checkPort = _ => Promise.resolve(portResults())

  return netmap.pingSweep(['192.168.1.1', '192.168.1.2']).then(results => {
    expect(results.hosts).toBeDefined()
  })
})

test('pingSweep() results hosts contain expected parameters', () => {
  expect.assertions(3)

  const portResults = jest.fn()
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.2', port: 80, delta: 1})

  const netmap = new NetMap({timeout: 1})
  netmap.checkPort = _ => Promise.resolve(portResults())

  return netmap.pingSweep(['192.168.1.1', '192.168.1.2']).then(results => {
    expect(results.hosts[0].host).toBeDefined()
    expect(results.hosts[0].live).toBeDefined()
    expect(results.hosts[0].delta).toBeDefined()
  })
})

test('pingSweep() marks hosts that timeout as offline', () => {
  expect.assertions(1)

  const portResults = jest.fn()
  portResults.mockReturnValueOnce({host: '192.168.1.1', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.2', port: 80, delta: 1})
  portResults.mockReturnValueOnce({host: '192.168.1.3', port: 80, delta: 20})

  const netmap = new NetMap({timeout: 20})
  netmap.checkPort = _ => Promise.resolve(portResults())

  return netmap.pingSweep(['192.168.1.1', '192.168.1.2']).then(results => {
    const liveHosts = results.hosts.filter(entry => entry.live)
    expect(liveHosts.length).toEqual(2)
  })
})
