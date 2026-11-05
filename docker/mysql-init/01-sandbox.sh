#!/bin/bash
# Usuario del sandbox: solo puede crear/usar bases que empiecen con "sbx_".
mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
CREATE USER 'sandbox'@'%' IDENTIFIED BY '${SANDBOX_MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON \`sbx\\_%\`.* TO 'sandbox'@'%';
ALTER USER 'sandbox'@'%' WITH MAX_USER_CONNECTIONS 6;
FLUSH PRIVILEGES;
SQL
