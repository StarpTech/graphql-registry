// mostly copied from https://github.com/jshttp/basic-auth

import type { Handler } from 'worktop'

// cloudflare global secret
declare const ALLOWED_CLIENT_SECRETS: string

const CREDENTIALS_REGEXP = /^ *(?:[Bb][Aa][Ss][Ii][Cc]) +([A-Za-z0-9._~+/-]+=*) *$/
const USER_PASS_REGEXP = /^([^:]*):(.*)$/

export const basicAuth: Handler = async function (req, res) {
  const authHeaderVal = req.headers.get('authorization')
  if (!authHeaderVal) {
    return res.send(401)
  }
  if (authHeaderVal) {
    const cred = parse(authHeaderVal)

    if (!cred) {
      return res.send(401)
    }

    if (
      !ALLOWED_CLIENT_SECRETS.split(',').find(
        (secret) => secret === cred.name && secret === cred.pass,
      )
    ) {
      return res.send(401)
    }
  }
}

export const parse = function (header: string) {
  if (typeof header !== 'string') {
    return undefined
  }

  // parse header
  const match = CREDENTIALS_REGEXP.exec(header)

  if (!match) {
    return undefined
  }

  // decode user pass
  const userPass = USER_PASS_REGEXP.exec(atob(match[1]))

  if (!userPass) {
    return undefined
  }

  return { name: userPass[1], pass: userPass[2] }
}
