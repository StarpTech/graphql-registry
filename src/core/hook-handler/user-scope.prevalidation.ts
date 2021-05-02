import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify'
import { InvalidServiceScopeError } from '../errrors'

export interface RequestContext {
  Body: { service_name: string }
}

/**
 * Validate if the client is able to register a schema in the name of the service
 * TODO: Should not be necessary to pass type to FastifyRequest
 */
export const checkUserServiceScope = function (
  req: FastifyRequest<RequestContext>,
  res: FastifyReply,
  next: HookHandlerDoneFunction,
) {
  // JWT context ?
  if (req.user) {
    if (req.body.service_name && !req.user.services.find((service) => service === req.body.service_name)) {
      return next(InvalidServiceScopeError(req.body.service_name))
    }
  }
  next()
}
