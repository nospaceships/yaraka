Name:           yaraka-smtp
Release:        1
Summary:        Real-time email scanning using Yara
Group:          Security
License:        MIT
URL:            https://github.com/nospaceships/yaraka
Source0:        yaraka-smtp-%{version}.tar.gz

%global __requires_exclude ^\/usr\/sbin\/dtrace|\/usr\/bin\/perl|perl(.+)$

%description
%{summary}

%prep
%setup

%build

%post
for file in loglevel plugins rules.yara smtp.ini tls.ini yaraka-smtp.pem yaraka-smtp.json; do
	if [ ! -f /opt/yaraka-smtp/config/$file ]; then
		cp /opt/yaraka-smtp/config/$file.default /opt/yaraka-smtp/config/$file
	fi
done

/opt/yaraka-smtp/node /opt/yaraka-smtp/yaraka-smtp.js --add
systemctl start yaraka-smtp

%preun
systemctl stop yaraka-smtp
/opt/yaraka-smtp/node /opt/yaraka-smtp/yaraka-smtp.js --remove

%install
rm -rf $RPM_BUILD_ROOT
mkdir -p $RPM_BUILD_ROOT/opt/yaraka-smtp
cp -r * $RPM_BUILD_ROOT/opt/yaraka-smtp


%files
/opt/yaraka-smtp
