// Validation utilities
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password) => {
  return password && password.length >= 8;
};

export const validatePhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
};

export const validateSAIDNumber = (idNumber) => {
  if (!idNumber || idNumber.length !== 13) return false;
  return /^\d{13}$/.test(idNumber);
};

export const validateRequired = (value) => {
  return value && value.toString().trim().length > 0;
};
