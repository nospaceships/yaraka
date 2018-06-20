Name:           yaraka
Release:        1
Summary:        Real-time email and file scanning with Yara
Group:          Security
License:        MIT
URL:            https://github.com/nospaceships/yaraka
Source0:        yaraka-%{version}.tar.gz

%global __requires_exclude ^\/usr\/sbin\/dtrace|\/usr\/bin\/perl|perl(.+)$

%description
%{summary}

%prep
%setup

%build

%post
for file in loglevel plugins rules.yara smtp.ini tls.ini yaraka-http.pem yaraka-http.json yaraka-smtp.pem yaraka-smtp.json; do
	if [ ! -f /opt/yaraka/config/$file ]; then
		cp /opt/yaraka/config/$file.default /opt/yaraka/config/$file
	fi
done

/opt/yaraka/node /opt/yaraka/yaraka-smtp.js --add
systemctl start yaraka-smtp

/opt/yaraka/node /opt/yaraka/yaraka-http.js --add
systemctl start yaraka-http

%preun
systemctl stop yaraka-http
/opt/yaraka-http/node /opt/yaraka-http/yaraka-http.js --remove

systemctl stop yaraka-smtp
/opt/yaraka-smtp/node /opt/yaraka-smtp/yaraka-smtp.js --remove

%install
rm -rf $RPM_BUILD_ROOT
mkdir -p $RPM_BUILD_ROOT/opt/yaraka
cp -r * $RPM_BUILD_ROOT/opt/yaraka


%files
/opt/yaraka
