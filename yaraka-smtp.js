
// Copyright 2018 NoSpaceships Ltd

process.chdir(__dirname)
process.env.HARAKA = __dirname

var Service = require("os-service")

if (process.argv[2] == "--add") {
	Service.add("yaraka-smtp", {programArgs: ["--run"]}, function(error) { 
		if (error) {
			throw new Error("Service.add() failed: " + error.message)
		}
	})
} else if (process.argv[2] == "--remove") {
	Service.remove("yaraka-smtp", function(error) { 
		if (error) {
			throw new Error("Service.remove() failed: " + error.message)
		}
	})
} else if (process.argv[2] == "--run") {
	Service.run(function() {
		Service.stop(0)
	})

	require("yara").initialize(function(error) {
		if (error) {
			throw new Error("Yara.initialize() failed: " + error.message)
		} else {
			require("Haraka")
		}
	})
} else {
	console.log("usage: node yaraka-smtp --add")
	console.log("       node yaraka-smtp --remove")
	console.log("       node yaraka-smtp --run")
	process.exit(1)
}
