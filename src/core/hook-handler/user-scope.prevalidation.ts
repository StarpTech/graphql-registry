import { preValidationHookHandler } from "fastify"
import { InvalidServiceScopeError } from "../errrors"

/**
 * Validate if the client is able to register a schema in the name of the service
 * TODO: check of we can type the body, https://github.com/fastify/help/issues/427
 */
export const checkUserServiceScope: preValidationHookHandler = function (req, res, next) {
  // JWT context ?
  if (req.user) {
    const body = req.body as { service_name: string }
    if (body.service_name && !req.user.services.find((service) => service === body.service_name)) {
      return next(InvalidServiceScopeError(body.service_name))
    }
  }
  next()
}