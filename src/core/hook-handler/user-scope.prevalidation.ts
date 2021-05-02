import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify'
import { InvalidServiceScopeError } from '../errrors'

export interface RequestContext {
  Body: { service_name: string }
}

/**
 * Validate if the client is able to register a schema in the name of the service
 */
export const checkUserServiceScope = function (
  req: FastifyRequest<RequestContext>,
  res: FastifyReply,
  next: HookHandlerDoneFunction,
) {
  // JWT context ?
  if (req.user && req.body.service_name) {
    if (!req.user.services.find((service) => service === req.body.service_name)) {
      return next(InvalidServiceScopeError(req.body.service_name))
    }
  }
  next()
}
