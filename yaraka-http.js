
// Copyright 2018 NoSpaceships Ltd

process.chdir(__dirname)

var Service = require("os-service")

if (process.argv[2] == "--add") {
	Service.add("yaraka-http", {programArgs: ["--run"]}, function(error) { 
		if (error) {
			throw new Error("Service.add() failed: " + error.message)
		}
	})
} else if (process.argv[2] == "--remove") {
	Service.remove("yaraka-http", function(error) { 
		if (error) {
			throw new Error("Service.remove() failed: " + error.message)
		}
	})
} else if (process.argv[2] == "--run") {
	Service.run(function() {
		Service.stop(0)
	})

	var Fs = require("fs")
	var Https = require("https")
	var Yaraka = require("./lib/yaraka")

	var config = require("./config/yaraka-http.json")

	if (config.tls.key)
		config.tls.key = Fs.readFileSync(config.tls.key)
	if (config.tls.cert)
		config.tls.cert = Fs.readFileSync(config.tls.cert)

	var port = config.listen.port
	var addr = config.listen.address || '0.0.0.0'

	require("yara").initialize(function(error) {
		if (error) {
			throw new Error("Yara.initialize() failed: " + error.message)
		} else {
			var scanner = Yaraka.createScanner()

			scanner.configure(config.rules, function(error) {
				if (error) {
					throw error
				} else {
					var server = Https.createServer(config.tls)

					function returnError(res, code, message) {
						res.statusCode = code
						res.statusMessage = message
						res.end()
					}

					function returnObject(res, object) {
						res.setHeader("Content-Type", "application/json")
						res.end(JSON.stringify(object))
					}

					server.on("request", function(req, res) {
						var client = req.connection.remoteAddress
						console.log(client + ": " + req.method + " " + req.url)

						if (req.url == "/") {
							returnError(400, "Path not specified")
						} else {
							var buffers = []
							
							req.on("data", function(data) {
								buffers.push(data)
							})

							req.on("end", function() {
								var body = Buffer.concat(buffers)

								if (body.length < 1) {
									returnObject(res, [])
								} else {
									var request = {buffer: body}

									scanner.scan(request, function(error, rules) {
										if (error) {
											returnError(500, error.message)
										} else {
											returnObject(res, rules)
										}
									})
								}
							})
						}
					})

					server.listen(port, addr, function() {
						var addr = server.address().address
						var port = server.address().port
						console.log("Listening on " + addr + ":" + port)
					})

					server.on("error", function (error) {
						console.error(error)
						process.exit(2)
					})
				}
			})
		}
	})
} else {
	console.log("usage: node yaraka-http --add")
	console.log("       node yaraka-http --remove")
	console.log("       node yaraka-http --run")
	process.exit(1)
}
