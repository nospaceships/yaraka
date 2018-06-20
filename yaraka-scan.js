
// Copyright 2018 NoSpaceships Ltd

process.chdir(__dirname)

if (process.argv.length > 3) {
	var Fs = require("fs")
	var Yaraka = require("./lib/yaraka")

	require("yara").initialize(function(error) {
		if (error) {
			throw new Error("Yara.initialize() failed: " + error.message)
		} else {
			var scanner = Yaraka.createScanner()

			scanner.configure([{filename: process.argv[2]}], function(error) {
				if (error) {
					throw error
				} else {
					var files = []
					var max_outstanding = 100

					function scanOne() {
						if (files.length) {
							var file = files.shift()
							var request = {filename: file.filename}

							scanner.scan(request, function(error, rules) {
								if (error) {
									file.error = error.message
								} else {
									file.rules = rules
								}

								if (file.rules.length) {
									console.log(JSON.stringify(file))
								}
								
								scanOne()
							})
						}
					}

					function startScan() {
						for (var i = 0; i < max_outstanding; i++) {
							scanOne()
						}
					}

					function ls(paths) {
						if (paths.length) {
							var path = paths.shift()

							Fs.lstat(path, function(error, stats) {
								if (error) {
									throw new Error("Fs.stat(" + path + ") failed: "
											+ error.message)
								} else {
									if (stats.isDirectory()) {
										Fs.readdir(path, function(error, files) {
											if (error) {
												throw new Error("Fs.readdir(" + path + ") failed: "
														+ error.message)
											} else {
												files.forEach(function(file) {
													paths.push(path + "/" + file)
												})

												process.nextTick(function() {
													ls(paths)
												})
											}
										})
									} else if (stats.isFile()) {
										files.push({filename: path})

										process.nextTick(function() {
											ls(paths)
										})
									} else {
										process.nextTick(function() {
											ls(paths)
										})
									}
								}
							})
						} else {
							startScan()
						}
					}

					ls([process.argv[3]])
				}
			})
		}
	})
} else {
	console.log("usage: node yaraka-scan <rules-file> <file-or-dir>")
	process.exit(1)
}
