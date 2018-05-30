# netmap.js

Fast browser-based network discovery module

## Description

`netmap.js` provides browser-based host discovery and port scanning capabilities to allow you to map website visitors' networks.

It's quite fast, making use of [`es6-promise-pool`](https://github.com/timdp/es6-promise-pool) to efficiently run the maximum number of concurrent connections browsers will allow.

## Motivation

I needed a browser-based port scanner for an idea I was working on. I thought it would be a simple matter of importing an existing module or copy-pasting from another project like [BeEF](http://beefproject.com/).

Turns out there wasn't a decent ready-to-use `npm` module and the [`port_scanner`](https://github.com/beefproject/beef/blob/master/modules/network/port_scanner/command.js) module in BeEF is (at the time of writing) inaccurate, slow and doesn't work on Chromium.

`netmap.js` is therefor a somewhat-optimized "ping" sweeper and TCP scanner that works on all modern browsers.

## Examples

### Find Live Hosts

Let's figure out the IP address of a website visitor's gateway, starting from a list of likely candidates in a home environment:

```javascript
import NetMap from 'netmap'

const netmap = new NetMap()
const hosts = ['192.168.0.1', '192.168.0.254', '192.168.1.1', '192.168.1.254']

netmap.pingSweep(hosts, (results) => {
  console.log(results)
})
```

```json
{
  "hosts": [
    { "host": "192.168.0.1", "delta": 2003, "live": false },
    { "host": "192.168.0.254", "delta": 2001, "live": false },
    { "host": "192.168.1.1", "delta": 18, "live": true },
    { "host": "192.168.1.254", "delta": 2002, "live": false }
  ],
  "meta": {}
}
```

Host `192.168.1.1` appears to be live.

### TCP Port Scan

Let's try to find some open TCP ports on a few hosts:

```javascript
import NetMap from 'netmap'

const netmap = new NetMap()
const hosts = ['192.168.1.1', '192.168.99.100', 'google.co.uk']
const ports = [80, 443, 8000, 8080, 27017]

netmap.tcpScan(hosts, ports, (results) => {
  console.log(results)
})
```

```json
{
  "hosts": [
    {
      "host": "192.168.1.1",
      "ports": [
        { "port": 443, "delta": 15 },
        { "port": 8000, "delta": 19 },
        { "port": 8080, "delta": 21 },
        { "port": 27017, "delta": 26 },
        { "port": 80, "delta": 95 }
      ]
    },
    {
      "host": "192.168.99.100",
      "ports": [
        { "port": 8080, "delta": 40 },
        { "port": 80, "delta": 2001 },
        { "port": 443, "delta": 2000 },
        { "port": 8000, "delta": 2004 },
        { "port": 27017, "delta": 2000 }
      ]
    },
    {
      "host": "google.co.uk",
      "ports": [
        { "port": 443, "delta": 67 },
        { "port": 80, "delta": 159 },
        { "port": 8000, "delta": 2001 },
        { "port": 8080, "delta": 2002 },
        { "port": 27017, "delta": 2000 }
      ]
    }
  ],
  "meta": {}
}
```

You'll notice that `netmap.js` doesn't try to tell us if a port is open or closed (yet). Rather it returns the time in milliseconds (`delta`) the browser took to throw an error when trying to connect to the port. The default timeout is 2000 milliseconds.

At first the results may seem contradictory.

`192.168.1.1` is a physical machine on the local network segment, and the only port open is `80`. We can see that it took the browser about 5 times longer to error out on `80` compared to the other, closed, ports.

`192.168.99.100` is a host-only VM with port `8080` open and `google.co.uk` is an external host with both `443` and `80` open. In this case the browser threw an error relatively rapidly on the open ports while the closed ports simply timed out. [The Theory](#the-theory) section further down explains when this happens.

## Limitations

### Port Blacklists

Browsers maintain a blacklist of ports against which they'll refuse to connect (such as FTP, SSH or SMTP). If you try to scan those ports with `netmap.js` using the default protocol (`http`) you'll get a very short timeout. A short timeout is usually a sign that the port is closed but in the case of blacklisted ports it doesn't mean anything.

You can check the blacklists from these sources:

* [Chromium source](https://github.com/adobe/chromium/blob/master/net/base/net_util.cc)
* [Mozilla docs](https://developer.mozilla.org/en-US/docs/Mozilla/Mozilla_Port_Blocking)
* Edge/IE (send me a link if you find a source)

It's possible to get around this limitation on Firefox (and maybe others) by using the `ftp` protocol instead of `http` to establish connections. You can specify the `protocol` in the options object when instantiating `NetMap`. When using `ftp` you should expect open ports to time out and closed ports to error out relatively rapidly. `ftp` scanning is also subject to the limitations around TCP `RST` packets discussed in this document.

Sub-resource requests from "legacy" protocols like `ftp` are blocked in Chromium.

### "Ping" Sweep

The "ping" sweep method provided by `netmap.js` does a pretty good job at quickly finding live physical hosts on a local network segment (other computers, routers, printers etc.)

However, due to the implementation this won't work when TCP `RST` packets are not returned. Typically:

* Windows machines
* Some external hosts
* Some network setups like bridged/host-only VMs

The reason behind this is explained in [The Theory](#the-theory) section below.

This limitation doesn't affect the TCP scanning capabilities and it's still possible to determine if the above hosts are live by trying to find an open port on them.

### General Lack of Accuracy

Overall, I've found this module to be more accurate and faster than the other bits of code I found laying around the web. That being said, the whole idea of mapping networks from a browser is going to be fidgety by nature. Your mileage may vary.

## Usage

### `NetMap` Constructor

The `NetMap` constructor takes an options object that allows you to configure:

* The `protocol` used for scanning (default `http`, see [Port Blacklists](#port-blacklists) for why you may want to set it to `ftp`)
* The port connection `timeout` (default `2000` milliseconds)

```javascript
import NetMap from 'netmap'

const netmap = new NetMap({
  protocol: 'http',
  timeout: 3000
})
```

### `pingSweep()`

The `pingSweep()` method determines if a given array of hosts are live. It does this by checking if connection to a port times out, in which case a host is considered offline (see ["Ping" Sweep](#ping-sweep) for limitations and [Standard Case](#standard-case) for the theory).

The method takes the follow parameters:

* `hosts` array of hosts to scan (IP addresses or host names)
* `callback(results)` to execute on completion
* `options` object with:
  * `maxConnections` - the maximum number of concurrent connections (by default `10` on Chrome and `17` on other browsers - the maximum concurrent connections supported by the browsers)
  * the `port` to scan (default to a random high port in the range `10000-20000`)

```javascript
netmap.pingSweep(['192.168.1.1'], (results) => {
  console.log(results)
}, {
  maxConnections: 5,
  port: 80
})
```

### `tcpScan()`

The `tcpScan()` method will perform a port scan against a range of targets. Read the [Standard Case](#standard-case) to understand how it does this.

The method takes the following parameters:

* `hosts` array of hosts to scan (IP addresses or host names)
* `ports` list of ports to scan (integers between 1-65535, avoid ports in the [blacklists](#port-blacklists))
* `callback(results)` to execute on completion
* `options` object with:
  * `maxConnections` - the maximum number of concurrent connections (by default `6` - the maximum connections per domain browsers will allow)
  * `portCallback` - a callback to execute when an individual `host:port` combination has finished scanning

```javascript
netmap.tcpScan(['192.168.1.1'], [80, 27017], (results) => {
  console.log(results)
}, {
  maxConnections: 5,
  portCallback: (result) => {
    console.log(result)
  }
})
```

Check the [example](#tcp-port-scan) to interpret the output.

## The Theory

This section briefly covers the theory behind the module's discovery techniques.

### The General Idea

This module uses `Image` objects to try to request cross-origin resources (the series of `http://{host}:{port}` URLs under test). The time it takes for the browser to raise an error (the `delta`), or the lack of error after a certain timeout value, provides insights into the state of the host and port under review.

#### Standard Case

A live host will _usually_ respond relatively rapidly with a TCP `RST` packet when attempting to connect to a closed port.

If the port is open, and even if it's not running an HTTP server, the browser will take a bit longer to raise an error due to the overhead of establishing a full TCP connection and then realising it can't get an image from the provided URL.

An offline host will naturally neither respond with a `RST` nor allow a full TCP connection to be established. Browsers will still try to establish the connection for a bit before timing out (~90 seconds). `netmap.js` will time out after waiting 2000 milliseconds by default.

In summary:

* Closed ports on live hosts will have a very short `delta`
* Open ports on live hosts will have a slightly longer `delta`
* Offline hosts or unused IP addresses will time out

The standard case is illustrated by the host `192.168.1.1` in the [TCP Port Scan](#tcp-port-scan) example.

#### No TCP `RST` Case

Some hosts (like `google.co.uk` or Windows hosts) and some network setups (like VirtualBox host-only networks) will not return TCP `RST` packets when hitting a closed port.

In these cases, closed ports will usually time out while open ports will quickly raise an error.

The implementation of the `pingSweep()` method is therefor unreliable when `RST` packets are not returned.

In summary, when TCP `RST` packets are not returned for whatever reason:

* Closed ports on live hosts will time out
* Open ports on live hosts will have a short `delta`
* `pingSweep()` can't distinguish between a closed port time out and a "dead" host time out

The special case is illustrated by the hosts `192.168.99.100` and `google.co.uk` in the [TCP Port Scan](#tcp-port-scan) example.

### Disregarding WebSockets and AJAX

It's well-documented that you should also be able to map networks with WebSockets and AJAX.

I gave it a try (and also tweaked BeEF to try its `port_scanner` module with WebSockets and AJAX only); I found both methods to produce completely unreliable results.

Please let me know if I'm missing something in this regard.
