import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify'
import { InvalidServiceScopeError } from '../errrors'

export interface RequestContext {
  Body: { serviceName: string }
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
  if (req.user && req.body.serviceName) {
    if (req.body.serviceName === req.user.client) {
      return next()
    } else if (!req.user.services.find((service) => service === req.body.serviceName)) {
      return next(InvalidServiceScopeError(req.body.serviceName))
    }
  }
  next()
}
