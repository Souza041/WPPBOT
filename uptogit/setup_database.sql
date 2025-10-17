-- Script de configuração do banco de dados MariaDB
-- Execute este script como administrador para configurar a autenticação

-- Alterar senha do root (caso queira usar root com senha)
ALTER USER 'root'@'localhost' IDENTIFIED BY '040898';

-- Ou criar um novo usuário específico para o bot (recomendado)
-- Sintaxe do MariaDB usa VIA ... USING
CREATE USER IF NOT EXISTS 'whatsapp_bot'@'localhost'
  IDENTIFIED VIA mysql_native_password USING PASSWORD('040898');

-- Criar o banco de dados
CREATE DATABASE IF NOT EXISTS whatsapp_bot
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Conceder privilégios ao usuário do bot
GRANT ALL PRIVILEGES ON whatsapp_bot.* TO 'whatsapp_bot'@'localhost';

-- Para usuário root (se preferir usar root)
GRANT ALL PRIVILEGES ON whatsapp_bot.* TO 'root'@'localhost';

-- Aplicar as alterações
FLUSH PRIVILEGES;

-- Mostrar usuários criados
SELECT User, Host, plugin FROM mysql.user WHERE User IN ('root', 'whatsapp_bot');

-- Verificar se o banco foi criado
SHOW DATABASES LIKE 'whatsapp_bot';
