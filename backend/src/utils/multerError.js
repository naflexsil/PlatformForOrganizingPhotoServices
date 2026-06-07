export const multerErrorMessage = (err) => {
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return 'Файл слишком большой';
    case 'LIMIT_FILE_COUNT':
      return 'Слишком много файлов';
    case 'LIMIT_UNEXPECTED_FILE':
      return 'Неожиданное поле файла';
    default:
      return err.message;
  }
};
