
# yaraka - Real-time email scanning with YARA

The NoSpaceships yaraka project is built on top of the open-source
[Haraka][haraka] SMTP server.  It scans any email sent to it, in real-time,
using YARA rules contained within one or more configured files.

Yaraka is delivered as an open-source GitHub hosted code repository.  Included
is a Makefile which be used to build an RPM package which in turn can be used
to install it on one or more hosts.  Yaraka is designed to be run in
production, to scan all emails received by an organization.

[NoSpaceships][nospaceships] has released this project under the terms of the
MIT license.  We intend to continue and enhance this project with a several
planned features - which we would be happy to share via ad-hoc private
communication.

If you have any issues or feedback, or would like to discuss any requirements
you may have, please [contact us][contact-us], as it will help us shape this
project into a useful tool.

The [yaraka blog][yaraka-blog] post on the NoSpaceships website provides an
example of how to deploy and integrate yaraka with O365.

This project is designed to be used in a production environment.
[NoSpaceships][nospaceships] provides free support on a best-effort basis for
this project.

# Getting Started

This project is open-source.  Users are expected to checkout the projects
repository and build the project, i.e. precompiled packages are not provided.
However, build and installation is very simple.

The first step is to checkout the projects repository and build its
dependencies.  From there, either an RPM can be built for deployment on
several servers, or yaraka can be started from the project repository for
testing.

Follow the _Installation_ section which will provide instructions on getting
the project repository checked out and built, how to build an RPM, and how to
start yaraka from under the repository.

Following this, refer to the _YARA Rule Management_ section to understand how
to configure new YARA rules or to integrate your own YARA rule sets.

Then, refer to the _Scanning Emails_ section to understand how emails can be
sent to the SMTP server for scanning, and how results are processed.

# Installation

Instead of sitting in front of an email service and actively blocking
email, yaraka sits alongside, passively monitoring for potential
threats and providing notification of them.  This approach does not require a
change in architecture and minimises the service availability risk that comes
with using an in-line solution.

Yaraka has been tested to work on 64bit CentOS 7 and at least the following
hardware configuration:

 * 2 CPU cores
 * 4GB of memory (yaraka requires only 2GB of this)
 * 40GB hard disk (yaraka requires only 200MB of this)

First, install several dependencies required to build and run yaraka:

	# epel-release is required for the yara and yara-devel packages.  If you
	# have compiled and installed YARA already then the first two commands can
	# be skipped.
	sudo yum -y install epel-release
	sudo yum -y install yara yara-devel
	sudo yum -y install git gcc-c++ rpm-build

Now checkout the projects repository and build it:

	git clone https://github.com/nospaceships/yaraka.git
	cd yaraka
	make deps

From here there are two ways to utilise yaraka.

The first method is to simply run yaraka within the repository.  To do this
create some configuration files, and then start the `yaraka-smtp` service:

	make configs
	./node yaraka-smtp --run

The `yaraka-smtp` service will run as the current user and listen on TCP port
1125.  Use `CTRL+C` to stop the service.

The second method is to build an RPM and install yaraka.  Use the following
command to build the RPM:

	make rpm

When installed, yaraka will run as the `yaraka` user and listen on TCP port 25.
Therefore, before installation, create the `yaraka` user and ensure the
`postfix` service is not listening on TCP port 25:

	sudo useradd -m yaraka
	sudo systemctl stop postfix
	sudo systemctl disable postfix

Then install the yaraka RPM (where `x.x.x` is the version just built):

	# epel-release is required for the yara package.  If you have compiled and
	# installed YARA already then the first two commands can be skipped.
	sudo yum -y install epel-release
	sudo yum -y install yara
	sudo rpm -i dist/x.x.x/yaraka-smtp-x.x.x-1.x86_64.rpm

Following this, the `yaraka-smtp` service will be installed, enabled and
started, be running as the `yaraka` user, and listening on TCP port 25.

For either of the above methods, if a local firewall is utilised, it will
likely require an update to permit inbound SMTP connections on the configured
port (e.g. TCP port 25 or 1125).

Yaraka supports the SMTP `STARTTLS` command.  By default the self-signed
certificate and key found in the `config/yaraka-smtp.pem` file in the projects
repository is used, which can be replaced if required.  Alternatively the
`config/tls.ini` file can be updated to use a different certificate and key
file.  The `yaraka-smtp` service should be restarted after modifying any of the
above files.

The _Scanning Emails_ section documents how the `ssmtp` program can be used to
test the installation.

# YARA Rule Management

By default, yaraka will load the `config/rules.yara` file.  This file contains
a simple example YARA rule.

This file can be used to configure new rules, or to include other rules using
YARA syntax.  Refer to the [YARA documentation][yara-manuals] for details on
YARA syntax.

Alternatively, the `config/yaraka-smtp.json` file can be updated to load rules
from other files:

	"rules": [
		{"filename": "./config/rules.yara"}
	]

More rule files can be appended to the list of rule files.

Updates to the configuration file, or to any YARA rule file, would require a
restart of the `yaraka-smtp` service.

# Scanning Emails

By default, the SMTP server listens on TCP port 1125 when run from the projects
repository, and TCP port 25 when installed via its RPM.  The listen port can be
modified in the `config/smtp.ini` file.  This is one of Haraka's many
configuration files, some of which can be found pre-defined under the `config`
directory.

Refer to the [Haraka documentation][haraka-manuals] for information on what
configuration files can be created.  Yaraka only loads a small set
of plugins to restrict how much processing is performed on each email,
therefore requires only a limited sub-set of the Haraka configuration.

**NOTE** By default yaraka doesn't impose any limits on email size.  Yaraka
is designed to scan emails forwarded to it from an organizations email service,
and will assume the forwarding service to have already imposed such limits.
Having said that, the Haraka `databytes` configuration file can be used to
enforce an email size limit if required.

Upon receipt of an email, yaraka first scans an entire email as is
from top to bottom.  This includes all headers, and if there are attachments,
i.e. it's a multipart message, at this point they will remain encoded.
Following this, the email is decomposed into its constituent parts, and each of
these parts is scanned using the same rule set.  At this point, any encoded
content, i.e. a base64 encoded attachment, is decoded before it is scanned.

If at least one rule matched, yaraka will log an alert message to the
`/var/log/maillog` file via the local Syslog.  This message will include a
JSON object detailing all matched rules, and the following attributes of the
email scanned:

 * `message_id` - Value of the `Message-ID` header in the email, if available
 * `subject` - Value of the `Subject` header in the email, if available
 * `mail_from` - The origin mail from address as provided in the `MAIL FROM`
   command from the SMTP transaction

The `ssmtp` package can be installed and used on CentOS 7 to test an instance
of yaraka (the `/etc/ssmtp/ssmtp.conf` configuration file will likely require
editing so that it knows to connect locally, and which TCP port should be
used):

	sudo yum -y install ssmtp
	ssmtp support@nospaceships.com <<EOF
	From: stephen.vickers@nospaceships.com
	Message-ID: 1234@nospaceships.com
	Subject: Example email

	Hello, World!
	EOF

Inspect the `/var/log/maillog` file, the default rule will match the example
above:

	sudo grep "rule match" /var/log/maillog | tail -1
	Jun  4 21:03:41 dev1-centos7 haraka[3347]: [ALERT] [AF6336BF-946F-4DDA-BD05-CED635029EBB.1] [core] YARA rule match: {"message_id":"1234@nospaceships.com","subject":"Example email","mail_from":"<stephen@dev1-centos7>","rules":["hello_world"]}

The message ID in the `message_id` field can be used to identify the email
which triggered this alert in the email infrastructure.

# Changes

## Version 1.0.0 - 16/06/2018

 * Initial version

# License

Copyright 2018 NoSpaceships Ltd

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

[contact-us]: mailto:hello@nospaceships.com?subject=yaraka
[haraka]: https://haraka.github.io/
[haraka-manuals]: https://haraka.github.io/manual/CoreConfig.html
[node-yara]: https://www.npmjs.com/package/yara
[nospaceships]: https://nospaceships.com
[yara-manuals]: http://yara.readthedocs.io
[yaraka-blog]: https://www.nospaceships.com/2018/06/16/real-time-email-scanning-with-yara.html
