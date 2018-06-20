
var Yara = require("yara")

function Scanner(config) {
	this.config = config || {}
	this.yara = Yara.createScanner()
}

Scanner.prototype.configure = function(rules, cb) {
	this.yara.configure({rules: rules}, function(error, warnings) {
		if (error) {
			if (error instanceof Yara.CompileRulesError) {
				cb(new Error("yara.configure() failed: "
						+ error.message + ": " + JSON.stringify(error.errors)))
			} else {
				cb(new Error("yara.configure() failed: " + error.message))
			}
		} else {
			cb(null)
		}
	})

	return this
}

Scanner.prototype.scan = function(request, cb) {
	this.yara.scan(request, function(error, result) {
		if (error) {
			cb(new Error("yara.scan() failed: " + error.message))
		} else {
			var rules = {}
			result.rules.forEach(function(rule) {
				rules[rule.id]++
			})
			rules = Object.keys(rules)
			cb(null, rules)
		}
	})
}

exports.createScanner = function(config) {
	return new Scanner(config)
}
