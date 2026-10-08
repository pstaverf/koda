import type { ErrorCode } from "@koda/shared/errors";

export type ClientErrorCode = ErrorCode | "NETWORK_ERROR" | "UNKNOWN_ERROR";

export const strings = {
  appName: "Koda",
  common: {
    loading: "Загрузка…",
    close: "Закрыть",
    cancel: "Отмена",
    save: "Сохранить",
    continue: "Продолжить",
    back: "Назад",
    retry: "Повторить",
    optional: "необязательно",
    dismiss: "Скрыть уведомление",
    notifications: "Уведомления"
  },
  steps: {
    label: "Шаги",
    progress: (current: number, total: number): string => `Шаг ${current} из ${total}`
  },
  textarea: {
    counter: (length: number, max: number): string => `${length} / ${max}`
  },
  session: {
    expired: "Сеанс завершён. Войдите снова."
  },
  notFound: {
    title: "Страница не найдена",
    text: "Возможно, она была удалена или адрес введён с ошибкой.",
    action: "На главную"
  }
} as const;

export const errorMessages: Record<ClientErrorCode, string> = {
  VALIDATION_FAILED: "Проверьте введённые данные",
  FIELD_REQUIRED: "Обязательное поле",
  UNAUTHORIZED: "Требуется вход",
  FORBIDDEN: "Действие недоступно",
  NOT_FOUND: "Не найдено",
  CONFLICT: "Конфликт данных, обновите страницу",
  RATE_LIMITED: "Слишком много запросов, попробуйте позже",
  INTERNAL_ERROR: "Ошибка сервера, попробуйте позже",
  ID_GENERATION_FAILED: "Не удалось создать аккаунт, попробуйте ещё раз",
  INVALID_ORIGIN: "Запрос отклонён",
  INVALID_CLIENT: "Неподдерживаемый клиент",
  EMAIL_INVALID: "Некорректная почта",
  EMAIL_ALREADY_USED: "Эта почта уже используется",
  EMAIL_UNCHANGED: "Это ваша текущая почта",
  REGISTRATION_TOKEN_INVALID: "Регистрация устарела, начните заново",
  REGISTRATION_STEP_INVALID: "Шаг регистрации недоступен, начните заново",
  CODE_INVALID: "Неверный код",
  CODE_EXPIRED: "Срок действия кода истёк, запросите новый",
  CODE_ATTEMPTS_EXCEEDED: "Слишком много попыток, запросите новый код",
  CODE_COOLDOWN: "Подождите перед повторной отправкой",
  CODE_LIMIT_EXCEEDED: "Лимит кодов исчерпан, попробуйте позже",
  TURNSTILE_FAILED: "Проверка не пройдена, попробуйте ещё раз",
  CAPTCHA_REQUIRED: "Пройдите проверку",
  INVALID_CREDENTIALS: "Неверная почта или пароль",
  PASSWORD_INVALID: "Неверный пароль",
  PASSWORD_MISMATCH: "Пароли не совпадают",
  PASSWORD_SAME: "Новый пароль совпадает с текущим",
  REFRESH_TOKEN_INVALID: "Сеанс завершён. Войдите снова.",
  SESSION_NOT_FOUND: "Сеанс не найден",
  PROFILE_ID_INVALID: "Некорректный ID",
  DISPLAY_NAME_INVALID: "Имя должно быть от 1 до 32 символов",
  BIO_TOO_LONG: "Описание не длиннее 200 символов",
  BANNER_INVALID: "Некорректный баннер",
  MEDIA_TYPE_UNSUPPORTED: "Поддерживаются JPEG, PNG и WebP",
  MEDIA_TOO_LARGE: "Файл слишком большой",
  FRIEND_SELF: "Нельзя добавить себя",
  FRIEND_REQUEST_EXISTS: "Заявка уже отправлена",
  FRIEND_REQUEST_LIMIT: "Лимит заявок на сегодня исчерпан",
  FRIEND_REQUESTS_DISABLED: "Пользователь не принимает заявки",
  FRIEND_REQUEST_NOT_FOUND: "Заявка не найдена",
  NOT_FRIENDS: "Вы не друзья",
  BLOCK_SELF: "Нельзя заблокировать себя",
  BLOCK_EXISTS: "Пользователь уже заблокирован",
  BLOCK_NOT_FOUND: "Пользователь не заблокирован",
  BLOCKED: "Пользователь заблокирован",
  ACCOUNT_DELETED: "Аккаунт удалён",
  PRIVACY_INVALID: "Некорректные настройки приватности",
  NETWORK_ERROR: "Нет соединения с сервером",
  UNKNOWN_ERROR: "Что-то пошло не так"
};

export const errorText = (code: ClientErrorCode): string => errorMessages[code];
