const { errorResponse } = require('../utils/response.util');

const validate = (schema) => {
  return (req, res, next) => {
    if (!schema) return next();

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return errorResponse(res, errorMessage, 400);
    }

    req.body = value; // Replace body with validated and sanitised values
    next();
  };
};

module.exports = validate;
