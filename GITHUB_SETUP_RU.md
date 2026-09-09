# Как запустить базу на GitHub

## 1. Создайте репозиторий

1. Войдите в GitHub.
2. Нажмите значок «+» справа сверху → New repository.
3. Название: animeon-segments.
4. Выберите Public.
5. Не добавляйте README, .gitignore и лицензию — они уже лежат в готовой папке.
6. Нажмите Create repository.

## 2. Загрузите готовые файлы

1. На странице пустого репозитория нажмите uploading an existing file.
2. Перетащите содержимое папки animeon-segments целиком.
3. Проверьте, что загружены data, schema, scripts, .github, README.md, CONTRIBUTING.md и package.json.
4. Нажмите Commit changes.

Если веб-страница не приняла скрытую папку .github, загрузите её через GitHub Desktop или создайте файлы из неё вручную. Без неё база будет работать, но автоматической проверки и формы предложения не будет.

## 3. Включите проверку и автоматическое добавление

1. Откройте вкладку Actions репозитория.
2. Если GitHub предложит включить workflows, подтвердите.
3. Откройте запуск «Проверка таймкодов».
4. Должна появиться зелёная проверка Validate segments.

Затем:

1. Откройте Settings → Actions → General.
2. В разделе Workflow permissions выберите Read and write permissions.
3. Сохраните настройку.
4. Откройте Issues → Labels → New label.
5. Создайте метки с точными именами approved и submission.

Workflow «Принятие таймкода» будет автоматически изменять ветку main. Не включайте правило, полностью запрещающее GitHub Actions записывать в main. Если используете Rulesets, добавьте GitHub Actions в bypass list.

## 4. Подключите базу в AnimeOn Toolbox

Raw-ссылка:

~~~text
https://raw.githubusercontent.com/canflask/animeon-segments/main/data/segments.json
~~~

Ссылка на репозиторий:

~~~text
https://github.com/canflask/animeon-segments
~~~

1. Установите AnimeOn_Toolbox_v3.0.user.js в Tampermonkey.
2. Откройте AnimeOn.
3. В Toolbox выберите вкладку «Пропуск».
4. Раскройте «Подключение GitHub-базы».
5. Вставьте обе ссылки.
6. Нажмите «Сохранить и проверить».
7. В статусе должно появиться «GitHub-база».

Ссылки сохраняются в браузере. Редактировать сам userscript после этого не нужно.

## 5. Принимайте новые метки

Пользователь отмечает фрагмент в плеере и нажимает «Отправить через GitHub». Откроется готовый Issue.

После проверки:

1. Откройте Issue с предложением.
2. Проверьте серию и время.
3. Поставьте Issue метку approved.
4. Откройте Actions и убедитесь, что «Принятие таймкода» завершилось зелёным.

Workflow сам добавит или обновит запись в data/segments.json, изменит updatedAt и закроет Issue. Пользователи увидят метку при следующем обновлении базы. Кнопка «Обновить базу» позволяет не ждать окончания шестичасового кэша.

## 6. Включите автоматическую отправку без сервера

1. Откройте GitHub → Settings → Developer settings → GitHub Apps → New GitHub App.
2. Укажите имя, например AnimeOn Community Skip, и ссылку на репозиторий как Homepage URL.
3. Отключите Active в разделе Webhook.
4. В Repository permissions оставьте только Metadata: Read-only и установите Issues: Read and write.
5. В разделе Where can this GitHub App be installed выберите Only on this account и создайте приложение.
6. В настройках созданного приложения включите Enable Device Flow.
7. Откройте Install App и установите его только для репозитория animeon-segments.
8. Скопируйте Client ID со страницы GitHub App. Client secret и Private key не нужны.
9. Вставьте Client ID в настройки Firefox-расширения, включите автоматическую отправку и нажмите «Подключить GitHub».
10. Введите показанный восьмизначный код на открывшейся странице GitHub.

Расширение дополнительно ограничивает выдаваемый пользовательский токен ID репозитория animeon-segments. Токен хранится только в локальном профиле Firefox, обновляется через Device Flow и не публикуется в Issue или базе.

## Если проверка пишет «неизвестное поле submittedBy»

На GitHub осталась старая версия валидатора. Одним коммитом замените файлами из готовой папки:

- `scripts/validate.mjs`;
- `scripts/import-issue.mjs`;
- `schema/segments.schema.json`.

Эти версии разрешают необязательное поле `submittedBy`, проверяют ник AnimeOn без `@` и умеют импортировать OP + ED из одного JSON-блока. После коммита откройте неудачный запуск Actions и нажмите **Re-run failed jobs**.

## Если `git push` отклонён с ошибкой `fetch first`

Это значит, что два таймкода или ручной коммит одновременно изменили ветку `main`. Замените `.github/workflows/approve-issue.yml` версией из готовой папки. Новый workflow при конфликте получает свежий `main`, заново применяет Issue и повторяет отправку до пяти раз, не затирая уже добавленные сегменты.

Чтобы повторить уже упавшее Issue на новой версии workflow, временно снимите с него метку `approved`, а затем поставьте её снова. Обычный **Re-run failed jobs** запускает определение workflow из старого коммита.
