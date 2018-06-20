
// Copyright 2018 NoSpaceships Ltd

var Logger = require("Haraka/logger")
var Yaraka = require("../lib/yaraka")

var config = require("../config/yaraka-smtp.json")

var scanner = Yaraka.createScanner()

scanner.configure(config.rules, function(error, warnings) {
	if (error) {
		throw new Error("Yaraka scanner.configure() failed: " + error.message)
	}
})

exports.register = function() {
	this.register_hook('rcpt', 'accept_all')
	this.register_hook('data', 'init_transaction')
	this.register_hook('queue', 'scan')
}

exports.shutdown = function() {}

exports.accept_all = function(next, connection, params) {
	next(OK)
}

exports.init_transaction = function(next, connection, params) {
	connection.transaction.parse_body = true
	next(OK)
}

exports.scan = function(next, connection, params) {
	var transaction = connection.transaction

	transaction.message_stream.get_data(function(filedata) {
		var message_id = transaction.header.get("Message-ID").trim()

		connection.logwarn("Scanning message with ID " + message_id)

		var scan = {
			requests: [
				{buffer: filedata}
			],
			result: {
				message_id: message_id,
				subject: transaction.header.get("Subject").trim(),
				mail_from: transaction.mail_from.original,
				rules: {}
			}
		}

		function findObjects(object) {
			if (object.bodytext.length) {
				scan.requests.push(
					{buffer: Buffer.from(object.bodytext)}
				)
			} else {
				scan.requests.push(
					{buffer: object.buf, offset: 0, length: object.buf_fill}
				)
			}
			object.children.forEach(findObjects)
		}

		transaction.body.children.forEach(findObjects)

		function scanOne(index) {
			if (index < scan.requests.length) {
				scanner.scan(scan.requests[index], function(error, rules) {
					if (error) {
						connection.logalert("scanner.scan() failed: " + error.message)
						return next(DENYSOFT)
					} else {
						rules.forEach(function(rule) {
							scan.result.rules[rule]++
						})
						scanOne(index + 1)
					}
				})
			} else {
				scan.result.rules = Object.keys(scan.result.rules)
				if (scan.result.rules.length) {
					connection.logalert("YARA rule match: " + JSON.stringify(scan.result))
				}
				return next(OK)
			}
		}

		scanOne(0)
	})
}
