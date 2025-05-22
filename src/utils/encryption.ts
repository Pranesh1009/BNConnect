import bcrypt from 'bcryptjs';

export const encrypt = async (text: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(text, salt);
};

export const compare = async (text: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(text, hash);
}; 