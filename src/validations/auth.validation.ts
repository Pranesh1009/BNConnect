import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().required(),
  roleNames: Joi.array().items(Joi.string().valid('SUPER_ADMIN', 'SUB_ADMIN', 'LEADER'))
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
}); 