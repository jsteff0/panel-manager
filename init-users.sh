#!/bin/bash

# Сгенерировать 32-символьный HEX ключ (a-z + 0-9)
echo "🔐 Генерация HEX ключа (32 символа)..."
KEY=$(openssl rand -hex 16)

# Ввод исходной PostgreSQL ссылки
read -p "🔑 Введите PostgreSQL URL (например: postgresql://user:pass@host:5432/db): " DB_URL

# Проверка что не пусто
if [ -z "$DB_URL" ]; then
  echo "❌ PostgreSQL URL не введён. Выход."
  exit 1
fi

ENC_DB_URL=$(curl -s -X POST https://www.xcipher.link/api/encrypt \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$DB_URL\",\"key\":\"$KEY\"}" | jq -r .result)

if [[ "$ENC_DB_URL" == "null" || -z "$ENC_DB_URL" ]]; then
  echo "❌ Ошибка при шифровании PostgreSQL URL"
  exit 1
fi

echo "✅ PostgreSQL URL зашифрован"

# Создаём .env
echo "🔐 Генерация JWT_SECRET..."
JWT_SECRET=$(openssl rand -hex 32) # 64 символа

echo "✅ JWT_SECRET сгенерирован"

echo "JWT_SECRET=$JWT_SECRET" > .env

echo "KEY=$KEY" >> .env
echo "DATABASE_URL=$ENC_DB_URL" >> .env

echo "✅ .env файл создан"

# Создать JSON пользователей
cat <<EOF > temp_users.json
[
  {
    "login": "admin",
    "hash": "\$2b\$10\$b4L0t7KB6OUbL5o7QGyO8.IdEyFvKT7FX8Fb16F.6F./3.xGEyboe",
    "role": "admin"
  }
]
EOF

# Закодировать в base64
BASE64_TEXT=$(base64 -i temp_users.json)

# Отправить POST-запрос на API шифровки
ENCRYPTED=$(curl -s -X POST https://www.xcipher.link/api/encrypt \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"$BASE64_TEXT\", \"key\": \"$KEY\"}" | jq -r '.result')

# Проверка
if [[ -z "$ENCRYPTED" || "$ENCRYPTED" == "null" ]]; then
  echo "❌ Ошибка при шифровании. Проверь, что API доступен."
  rm temp_users.json
  exit 1
fi

# Сохранить в файл
mkdir -p data
echo "$ENCRYPTED" > data/users.enc
echo "✅ Зашифрованный файл сохранен в data/users.enc"

mkdir -p data
echo '["::1"]' > data/ipwhitelist.json
echo "✅ Создан data/ipwhitelist.json с localhost (::1)"

echo "🎉 Инициализация завершена успешно!"

# Очистка
rm temp_users.json
