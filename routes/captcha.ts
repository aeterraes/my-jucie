import { type Request, type Response, type NextFunction } from 'express'
import { CaptchaModel } from '../models/captcha'

// Простая функция безопасного вычисления выражений
function safeEval(a: number, op1: string, b: number, op2: string, c: number): number {
  const apply = (x: number, op: string, y: number) => {
    switch (op) {
      case '+': return x + y
      case '-': return x - y
      case '*': return x * y
      default: throw new Error('Invalid operator')
    }
  }
  return apply(apply(a, op1, b), op2, c)
}

export function captchas() {
  return async (req: Request, res: Response) => {
    const captchaId = req.app.locals.captchaId++
    const operators = ['*', '+', '-']

    const firstTerm = Math.floor(Math.random() * 10 + 1)
    const secondTerm = Math.floor(Math.random() * 10 + 1)
    const thirdTerm = Math.floor(Math.random() * 10 + 1)

    const firstOperator = operators[Math.floor(Math.random() * operators.length)]
    const secondOperator = operators[Math.floor(Math.random() * operators.length)]

    const expression = `${firstTerm}${firstOperator}${secondTerm}${secondOperator}${thirdTerm}`
    const answer = safeEval(firstTerm, firstOperator, secondTerm, secondOperator, thirdTerm).toString()

    const captcha = { captchaId, captcha: expression, answer }
    const captchaInstance = CaptchaModel.build(captcha)
    await captchaInstance.save()
    res.json(captcha)
  }
}

export const verifyCaptcha = () => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const captcha = await CaptchaModel.findOne({ where: { captchaId: req.body.captchaId } })
    if (captcha != null && req.body.captcha === captcha.answer) {
      next()
    } else {
      res.status(401).send(res.__('Wrong answer to CAPTCHA. Please try again.'))
    }
  } catch (error) {
    next(error)
  }
}