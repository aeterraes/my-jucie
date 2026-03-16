import { type Request, type Response, type NextFunction } from 'express'
import * as challengeUtils from '../lib/challengeUtils'
import { challenges } from '../data/datacache'
import * as security from '../lib/insecurity'
import * as utils from '../lib/utils'

export function b2bOrder() {
  return ({ body }: Request, res: Response, next: NextFunction) => {
    // Проверяем, включены ли специальные challenge
    const rceChallengeEnabled = utils.isChallengeEnabled(challenges.rceChallenge)
    const rceOccupyChallengeEnabled = utils.isChallengeEnabled(challenges.rceOccupyChallenge)

    const orderLinesData = body.orderLinesData || ''

    try {
      // Больше не выполняем код через vm или eval
      if (rceChallengeEnabled || rceOccupyChallengeEnabled) {
        // Вместо исполнения, просто проверяем на потенциально опасные паттерны
        if (orderLinesData.includes('while(true)') && rceOccupyChallengeEnabled) {
          challengeUtils.solve(challenges.rceOccupyChallenge)
          res.status(503)
          return next(new Error('Sorry, we are temporarily not available! Please try again later.'))
        }
        if (orderLinesData.includes('process') && rceChallengeEnabled) {
          challengeUtils.solve(challenges.rceChallenge)
        }
      }

      // Возвращаем безопасный ответ
      res.json({ cid: body.cid, orderNo: uniqueOrderNumber(), paymentDue: dateTwoWeeksFromNow() })
    } catch (err) {
      next(err)
    }

    function uniqueOrderNumber() {
      return security.hash(`${new Date().toString()}_B2B`)
    }

    function dateTwoWeeksFromNow() {
      return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
}