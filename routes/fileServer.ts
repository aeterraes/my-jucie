import path from 'node:path'
import { type Request, type Response, type NextFunction } from 'express'

import * as utils from '../lib/utils'
import * as security from '../lib/insecurity'
import { challenges } from '../data/datacache'
import * as challengeUtils from '../lib/challengeUtils'

export function servePublicFiles () {
    return ({ params }: Request, res: Response, next: NextFunction) => {
        let file = params.file

        if (file.includes('/') || file.includes('\\')) {
            res.status(403)
            return next(new Error('File names cannot contain slashes!'))
        }

        if (!endsWithAllowlistedFileType(file) && file !== 'incident-support.kdbx') {
            res.status(403)
            return next(new Error('Only .md and .pdf files are allowed!'))
        }

        file = security.cutOffPoisonNullByte(file)

        challengeUtils.solveIf(challenges.directoryListingChallenge, () => file.toLowerCase() === 'acquisitions.md')
        verifySuccessfulPoisonNullByteExploit(file)

        const safePath = path.resolve(path.join('ftp', file))
        res.sendFile(safePath)
    }

    function verifySuccessfulPoisonNullByteExploit (file: string) {
        challengeUtils.solveIf(challenges.easterEggLevelOneChallenge, () => file.toLowerCase() === 'eastere.gg')
        challengeUtils.solveIf(challenges.forgottenDevBackupChallenge, () => file.toLowerCase() === 'package.json.bak')
        challengeUtils.solveIf(challenges.forgottenBackupChallenge, () => file.toLowerCase() === 'coupons_2013.md.bak')
        challengeUtils.solveIf(challenges.misplacedSignatureFileChallenge, () => file.toLowerCase() === 'suspicious_errors.yml')
        challengeUtils.solveIf(challenges.nullByteChallenge, () => {
            return challenges.easterEggLevelOneChallenge.solved || challenges.forgottenDevBackupChallenge.solved ||
                challenges.forgottenBackupChallenge.solved || challenges.misplacedSignatureFileChallenge.solved ||
                file.toLowerCase() === 'encrypt.pyc'
        })
    }

    function endsWithAllowlistedFileType (param: string) {
        return utils.endsWith(param, '.md') || utils.endsWith(param, '.pdf')
    }
}