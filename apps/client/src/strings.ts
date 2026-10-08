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
  code: {
    cell: (index: number, total: number): string => `Символ ${index} из ${total}`
  },
  session: {
    expired: "Сеанс завершён. Войдите снова."
  },
  notFound: {
    title: "Страница не найдена",
    text: "Возможно, она была удалена или адрес введён с ошибкой.",
    action: "На главную"
  },
  nav: {
    profile: "Профиль",
    friends: "Друзья",
    settings: "Настройки"
  },
  emoji: {
    title: "Эмодзи",
    open: "Вставить эмодзи"
  },
  login: {
    subtitle: "Рады видеть вас снова",
    title: "Вход в Koda",
    emailLabel: "Почта",
    emailRequired: "Укажите почту",
    passwordLabel: "Пароль",
    passwordRequired: "Введите пароль",
    submit: "Войти",
    forgot: "Забыли пароль?",
    noAccount: "Нет аккаунта?",
    register: "Создать",
    welcome: "С возвращением",
    captchaNeeded: "Подтвердите, что вы не робот"
  },
  reset: {
    subtitle: "Восстановление доступа",
    title: "Забыли пароль?",
    text: "Пришлём код для смены пароля на почту аккаунта.",
    emailLabel: "Почта",
    hint: "6-значный код придёт в течение минуты.",
    submit: "Получить код",
    sent: "Если почта зарегистрирована, код отправлен",
    back: "Вернуться ко входу",
    confirmTitle: "Новый пароль",
    confirmText: "Введите код и придумайте новый пароль для",
    passwordLabel: "Новый пароль",
    confirmationLabel: "Повтор пароля",
    confirmSubmit: "Сменить пароль",
    otherEmail: "Другая почта",
    done: "Пароль изменён, войдите снова"
  },
  profile: {
    editTitle: "Настройки профиля",
    nameLabel: "Имя",
    bioLabel: "О себе",
    bioHint: "До 200 символов.",
    avatarAction: "Сменить аватар",
    avatarRemove: "Удалить аватар",
    bannerTitle: "Баннер",
    bannerUpload: "Загрузить баннер",
    bannerRemove: "Удалить баннер",
    cropAvatar: "Кадрирование аватара",
    cropBanner: "Кадрирование баннера",
    saved: "Профиль сохранён",
    bannerUpdated: "Баннер обновлён",
    photoUpdated: "Изображение обновлено",
    photoRemoved: "Изображение удалено",
    logout: "Выйти",
    loggedOut: "Вы вышли из аккаунта"
  },
  user: {
    notFound: "Профиль недоступен",
    toFriends: "К друзьям",
    online: "В сети",
    offline: "Не в сети",
    lastSeenHidden: "Был(-а) давно",
    bioHidden: "Пользователь скрыл описание",
    blocked: "Вы заблокировали этого пользователя",
    relations: {
      none: "Вы не знакомы",
      outgoing: "Заявка отправлена",
      incoming: "Хочет добавить вас",
      friends: "Вы друзья"
    }
  },
  register: {
    subtitle: "Создайте аккаунт Koda",
    steps: ["Почта", "Код", "Пароль", "Фото", "Имя"],
    email: {
      title: "Ваша почта",
      text: "Отправим на неё код подтверждения.",
      label: "Почта",
      hint: "6-значный код придёт в течение минуты.",
      submit: "Получить код",
      sent: "Код отправлен",
      alt: "Уже есть аккаунт?",
      altAction: "Войти"
    },
    code: {
      title: "Введите код",
      text: "Мы отправили 6-значный код на",
      label: "Код из письма",
      hint: "Вставьте код целиком или введите по цифрам.",
      verified: "Код подтверждён",
      resent: "Новый код отправлен",
      resend: "Отправить код повторно",
      resendIn: (seconds: number): string => `Повторно через ${seconds} с`,
      resendSeconds: 60,
      changeEmail: "Изменить почту",
      verifiedTitle: "Подтверждение"
    },
    password: {
      title: "Придумайте пароль",
      text: "Минимум 8 символов, буквы разного регистра и цифры.",
      passwordLabel: "Пароль",
      confirmationLabel: "Повтор пароля",
      hint: "Пароль хранится только в виде хеша.",
      checking: "Оцениваем надёжность…",
      labels: ["Очень слабый", "Слабый", "Средний", "Хороший", "Отличный"],
      minScore: 2,
      weak: "Пароль слишком простой",
      created: "Аккаунт создан",
      show: "Показать пароль",
      hide: "Скрыть пароль",
      submit: "Создать аккаунт",
      turnstileError: "Проверка не загрузилась",
      turnstileHint: "Подтвердите, что вы не робот."
    },
    photo: {
      title: "Добавьте фото",
      text: "Аватар можно выбрать позже в профиле.",
      pick: "Выбрать фото",
      change: "Заменить фото",
      skip: "Пропустить",
      cropTitle: "Кадрирование",
      zoom: "Масштаб",
      cancel: "Отмена",
      apply: "Готово",
      saved: "Аватар обновлён"
    },
    name: {
      title: "Как вас зовут?",
      text: "Имя видят друзья и собеседники.",
      label: "Имя",
      hint: "От 1 до 32 символов.",
      submit: "Завершить",
      done: "Добро пожаловать в Koda"
    }
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

export const asErrorCode = (value: string | undefined): ClientErrorCode | undefined =>
  value === undefined ? undefined : (value as ClientErrorCode);

export const strengthLabel = (score: number | null): string | null =>
  score === null ? null : (strings.register.password.labels[score] ?? strings.register.password.labels[0]);
