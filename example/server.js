'use strict';

const express = require('express');
const cluster = require('cluster');
const server = express();
const register = require('../').register;

const Histogram = require('../').Histogram;
const h = new Histogram({
	name: 'test_histogram',
	help: 'Example of a histogram',
	labelNames: ['code']
});

const Counter = require('../').Counter;
const c = new Counter({
	name: 'test_counter',
	help: 'Example of a counter',
	labelNames: ['code'],
	collect() {
		// collect is invoked each time `register.metrics()` is called.
		this.inc({ code: 200 });
	}
});

const Gauge = require('../').Gauge;
const g = new Gauge({
	name: 'test_gauge',
	help: 'Example of a gauge',
	labelNames: ['method', 'code']
});

setTimeout(() => {
	h.labels('200').observe(Math.random());
	h.labels('300').observe(Math.random());
}, 10);

setInterval(() => {
	c.inc({ code: 400 });
}, 2000);

setInterval(() => {
	c.inc();
}, 2000);

setInterval(() => {
	g.set({ method: 'get', code: 200 }, Math.random());
	g.set(Math.random());
	g.labels('post', '300').inc();
}, 100);

if (cluster.isWorker) {
	// Expose some worker-specific metric as an example
	setInterval(() => {
		c.inc({ code: `worker_${cluster.worker.id}` });
	}, 2000);
}

// Generate some garbage
const t = [];
setInterval(() => {
	for (let i = 0; i < 100; i++) {
		t.push(new Date());
	}
}, 10);
setInterval(() => {
	while (t.length > 0) {
		t.pop();
	}
});

server.get('/metrics', async (req, res) => {
	res.set('Content-Type', register.contentType);
	res.end(await register.metrics());
});

server.get('/metrics/counter', async (req, res) => {
	res.set('Content-Type', register.contentType);
	res.end(await register.getSingleMetricAsString('test_counter'));
});

// Enable collection of default metrics
require('../').collectDefaultMetrics({
	gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5] // These are the default buckets.
});

const port = process.env.PORT || 3000;
console.log(
	`Server listening to ${port}, metrics exposed on /metrics endpoint`
);
server.listen(port);
