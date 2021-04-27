# netmap.js [![](https://img.shields.io/npm/v/netmap.js.svg)](https://www.npmjs.com/package/netmap.js) [![](https://img.shields.io/travis/serain/netmap.js.svg)](https://travis-ci.org/serain/netmap.js.svg?branch=master) [![](https://img.shields.io/codecov/c/github/serain/netmap.js.svg)](https://codecov.io/gh/serain/netmap.js)

Fast browser-based network discovery module

This project is no longer maintained.

## Description

`netmap.js` provides browser-based host discovery and port scanning capabilities to allow you to map website visitors' networks.

It's quite fast, making use of [`es6-promise-pool`](https://github.com/timdp/es6-promise-pool) to efficiently run the maximum number of concurrent connections browsers will allow.

## Motivation

I needed a browser-based port scanner for an idea I was working on. I thought it would be a simple matter of importing an existing module or copy-pasting from another project like [BeEF](http://beefproject.com/).

Turns out there wasn't a decent ready-to-use `npm` module and the [`port_scanner`](https://github.com/beefproject/beef/blob/master/modules/network/port_scanner/command.js) module in BeEF is (at the time of writing) inaccurate, slow and doesn't work on Chromium.

`netmap.js` is therefor a somewhat optimized "ping" sweeper and TCP scanner that works on all modern browsers.

## Quickstart

### Install

```shell
npm install --save netmap.js
```

### Find Live Hosts

Let's figure out the IP address of a website visitor's gateway, starting from a list of likely candidates in a home environment:

```javascript
import NetMap from 'netmap.js'

const netmap = new NetMap()
const hosts = ['192.168.0.1', '192.168.0.254', '192.168.1.1', '192.168.1.254']

netmap.pingSweep(hosts).then(results => {
  console.log(results)
})
```

```json
{
  "hosts": [
    { "host": "192.168.0.1", "delta": 1003, "live": false },
    { "host": "192.168.0.254", "delta": 1001, "live": false },
    { "host": "192.168.1.1", "delta": 18, "live": true },
    { "host": "192.168.1.254", "delta": 1002, "live": false }
  ],
  "meta": {}
}
```

Host `192.168.1.1` appears to be live.

### Scan TCP Ports

Let's try to find some open TCP ports on a few hosts:

```javascript
import NetMap from 'netmap.js'

const netmap = new NetMap()
const hosts = ['192.168.1.1', '192.168.99.100', 'google.co.uk']
const ports = [80, 443, 8000, 8080, 27017]

netmap.tcpScan(hosts, ports).then(results => {
  console.log(results)
})
```

```json
{
  "hosts": [
    {
      "host": "192.168.1.1",
      "control": "22",
      "ports": [
        { "port": 443, "delta": 15, "open": false },
        { "port": 8000, "delta": 19, "open": false },
        { "port": 8080, "delta": 21, "open": false },
        { "port": 27017, "delta": 26, "open": false },
        { "port": 80, "delta": 95, "open": true }
      ]
    },
    {
      "host": "192.168.99.100",
      "control": "1001",
      "ports": [
        { "port": 8080, "delta": 40, "open": true },
        { "port": 80, "delta": 1001, "open": false },
        { "port": 443, "delta": 1000, "open": false },
        { "port": 8000, "delta": 1004, "open": false },
        { "port": 27017, "delta": 1000, "open": false }
      ]
    },
    {
      "host": "google.co.uk",
      "control": "1001",
      "ports": [
        { "port": 443, "delta": 67, "open": true },
        { "port": 80, "delta": 159, "open": true },
        { "port": 8000, "delta": 1001, "open": false },
        { "port": 8080, "delta": 1002, "open": false },
        { "port": 27017, "delta": 1000, "open": false }
      ]
    }
  ],
  "meta": {}
}
```

At first the results may seem contradictory.

`192.168.1.1` is an embedded Linux machine (a router) on the local network segment, and the only port open is `80`. We can see that it took the browser about 5 times longer to error out on `80` compared to the other, closed, ports.

`192.168.99.100` is a host-only VM with port `8080` open and `google.co.uk` is an external host with both `443` and `80` open. In these cases the browser threw an error relatively rapidly on the open ports while the closed ports simply timed out. The [Theory](#theory) section further down explains when this happens.

In order to determine if ports should be tagged as open or closed, `netmap.js` will scan a "control" port (by default `45000`) that is assumed to be closed. The `control` time is then used to determine the status of other ports. If the ratio `delta/control` is greater than a set value (default `0.8`), the port is assumed to be closed (tl;dr: a difference of more that 20% from the control time means the port is open).

## Limitations

### Port Blacklists

Browsers maintain a blacklist of ports against which they'll refuse to connect (such as FTP, SSH or SMTP). If you try to scan those ports with `netmap.js` using the default protocol (`http`) you'll get a very short timeout. A short timeout is usually a sign that the port is closed but in the case of blacklisted ports it doesn't mean anything.

You can check the blacklists from these sources:

* [Chromium source](https://github.com/adobe/chromium/blob/master/net/base/net_util.cc)
* [Mozilla docs](https://developer.mozilla.org/en-US/docs/Mozilla/Mozilla_Port_Blocking)
* Edge/IE (send me a link if you find a source)

Before [Firefox 61](https://blog.mozilla.org/security/2018/05/07/blocking-ftp-subresource-loads-within-non-ftp-documents-in-firefox-61/) (and maybe other browsers), it's possible to get around this limitation by using the `ftp` protocol instead of `http` to establish connections. You can specify the `protocol` in the options object when instantiating `NetMap`. When using `ftp` you should expect open ports to time out and closed ports to error out relatively rapidly. `ftp` scanning is also subject to the limitations around TCP `RST` packets discussed in this document.

Sub-resource requests from "legacy" protocols like `ftp` have been blocked for a while in Chromium.

### "Ping" Sweep

The "ping" sweep functionality provided by `netmap.js` does a pretty good job at quickly finding live *nix-based hosts on a local network segment (other computers, phones, routers, printers etc.)

However, due to the implementation this won't work when TCP `RST` packets are not returned. Typically:

* Windows machines
* Some external hosts
* Some network setups like bridged/host-only VMs

The reason behind this is explained in the [Theory](#theory) section below.

This limitation doesn't affect the TCP scanning capabilities and it's still possible to determine if the above hosts are live by trying to find an open port on them.

### General Lack of Accuracy

Overall, I've found this module to be more accurate and faster than the other bits of code I found laying around the web. That being said, the whole idea of mapping networks from a browser is going to be fidgety by nature. Your mileage may vary.

## Usage

### `NetMap` Constructor

The `NetMap` constructor takes an options object that allows you to configure:

* The `protocol` used for scanning (default `http`, see [Port Blacklists](#port-blacklists) for why you may want to set it to `ftp`)
* The port connection `timeout` (default `1000` milliseconds)

```javascript
import NetMap from 'netmap.js'

const netmap = new NetMap({
  protocol: 'http',
  timeout: 3000
})
```

### `pingSweep()`

The `pingSweep()` method determines if a given array of hosts are live. It does this by checking if connection to a port times out, in which case a host is considered offline (see ["Ping" Sweep](#ping-sweep) for limitations and [Standard Case](#standard-case) for the theory).

The method takes the following parameters:

* `hosts` array of hosts to scan (IP addresses or host names)
* `options` object with:
  * `maxConnections` - the maximum number of concurrent connections (by default `10` on Chrome and `17` on other browsers - the maximum concurrent connections supported by the browsers)
  * the `port` to scan (default `45000`)

It returns a promise.

```javascript
netmap.pingSweep(['192.168.1.1'], {
  maxConnections: 5,
  port: 80
}).then(results => {
  console.log(results)
})
```

### `tcpScan()`

The `tcpScan()` method will perform a port scan against a range of targets. Read the [Standard Case](#standard-case) to understand how it does this.

The method takes the following parameters:

* `hosts` array of hosts to scan (IP addresses or host names)
* `ports` list of ports to scan (integers between 1-65535, avoid ports in the [blacklists](#port-blacklists))
* `options` object with:
  * `maxConnections` - the maximum number of concurrent connections (by default `6` - the maximum connections per domain browsers will allow)
  * `portCallback` - a callback to execute when an individual `host:port` combination has finished scanning
  * `controlPort` - the port to scan to determine a baseline closed-port delta (default `45000`)
  * `controlRatio` - the similarity, in percentage, from the control delta for a port to be considered closed (default `0.8`, see [example](#scan-tcp-ports))

It returns a promise.

```javascript
netmap.tcpScan(['192.168.1.1'], [80, 27017], {
  maxConnections: 5,
  portCallback: result => {
    console.log(result)
  },
  controlPort: 45000,
  controlRatio: 0.8
}).then(results => {
  console.log(results)
})
```

Check the [example](#tcp-port-scan) to interpret the output.

## Theory

This section briefly covers the theory behind the module's discovery techniques.

### General Idea

This module uses `Image` objects to try to request cross-origin resources (the series of `http://{host}:{port}` URLs under test). The time it takes for the browser to raise an error (the `delta`), or the lack of error after a certain timeout value, provides insights into the state of the host and port under review.

#### Standard Case

A live host will _usually_ respond relatively rapidly with a TCP `RST` packet when attempting to connect to a closed port.

If the port is open, and even if it's not running an HTTP server, the browser will take a bit longer to raise an error due to the overhead of establishing a full TCP connection and then realising it can't get an image from the provided URL.

An offline host will naturally neither respond with a `RST` nor allow a full TCP connection to be established. Browsers will still try to establish the connection for a bit before timing out (~90 seconds). `netmap.js` will time out after waiting 1000 milliseconds by default.

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
