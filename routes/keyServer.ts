/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import path from 'node:path'
import { type Request, type Response, type NextFunction } from 'express'
import * as security from '../lib/insecurity'

export function serveKeyFiles () {
    return ({ params }: Request, res: Response, next: NextFunction) => {
        let file = params.file

        if (file.includes('/') || file.includes('\\')) {
            res.status(403)
            return next(new Error('File names cannot contain slashes!'))
        }

        const safePath = path.resolve(path.join('encryptionkeys', security.sanitizeFilename(file)))
        res.sendFile(safePath)
    }
}
