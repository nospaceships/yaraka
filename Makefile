
VERSION = $(shell grep version package.json | cut -d'"' -f4)

NODE = 10.3.0
BASE = $(shell pwd)

all: deps rpm

.PHONY: configs
configs:
	cp config/loglevel.default config/loglevel
	cp config/plugins.default config/plugins
	cp config/rules.yara.default config/rules.yara
	cp config/tls.ini.default config/tls.ini
	cp config/yaraka-http.json.default config/yaraka-http.json
	cp config/yaraka-http.pem.default config/yaraka-http.pem
	cp config/yaraka-smtp.json.default config/yaraka-smtp.json
	cp config/yaraka-smtp.pem.default config/yaraka-smtp.pem
	echo "port=1125" > config/smtp.ini

deps: deps_node deps_npm

deps_node:
	mkdir -p deps
	if [ ! -f deps/node-v$(NODE)-linux-x64.tar.xz ]; then cd deps && curl -O https://nodejs.org/dist/v$(NODE)/node-v$(NODE)-linux-x64.tar.xz; fi
	rm -rf deps/node-v$(NODE)-linux-x64
	cd deps && xz -d -c node-v$(NODE)-linux-x64.tar.xz | tar -xf -
	cp deps/node-v$(NODE)-linux-x64/bin/node .

deps_npm:
	PATH=$(BASE):$$PATH ./node $(BASE)/deps/node-v10.3.0-linux-x64/lib/node_modules/npm/bin/npm-cli.js install --nodedir=$(BASE)/deps/node-v$(NODE)-linux-x64

.PHONY: rpm
rpm:
	-rm -rf dist/$(VERSION)/rpm
	mkdir -p dist/$(VERSION)/rpm/SOURCES/yaraka-$(VERSION)
	mkdir -p dist/$(VERSION)/rpm/SOURCES/yaraka-$(VERSION)/config
	mkdir -p dist/$(VERSION)/rpm/SOURCES/yaraka-$(VERSION)/queue
	mkdir dist/$(VERSION)/rpm/SPECS
	mkdir dist/$(VERSION)/rpm/BUILD
	mkdir dist/$(VERSION)/rpm/RPMS
	mkdir dist/$(VERSION)/rpm/SRPMS
	cp -r yaraka-http.js yaraka-scan.js yaraka-smtp.js node node_modules plugins dist/$(VERSION)/rpm/SOURCES/yaraka-$(VERSION)
	echo {\"version\": \"$(VERSION)\"} > dist/$(VERSION)/rpm/SOURCES/yaraka-$(VERSION)/config/app.json
	cp config/*.default dist/$(VERSION)/rpm/SOURCES/yaraka-$(VERSION)/config
	cd dist/$(VERSION)/rpm/SOURCES && tar -czvf yaraka-$(VERSION).tar.gz yaraka-$(VERSION)
	rm -rf dist/$(VERSION)/rpm/SOURCES/yaraka-$(VERSION)
	echo "Version: $(VERSION)" > dist/$(VERSION)/rpm/SPECS/yaraka.spec
	cat rpm/yaraka.spec >> dist/$(VERSION)/rpm/SPECS/yaraka.spec
	cd dist/$(VERSION)/rpm && rpmbuild -ba --define "_topdir $(BASE)/dist/$(VERSION)/rpm" SPECS/yaraka.spec
	cp dist/$(VERSION)/rpm/RPMS/x86_64/* dist/$(VERSION)
	cp dist/$(VERSION)/rpm/SRPMS/* dist/$(VERSION)
	rm -rf dist/$(VERSION)/rpm
