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
