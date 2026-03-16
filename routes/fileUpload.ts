import os from 'node:os'
import fs from 'node:fs/promises'
import path from 'node:path'
import yaml from 'js-yaml'
import unzipper from 'unzipper'
import { type NextFunction, type Request, type Response } from 'express'

import * as challengeUtils from '../lib/challengeUtils'
import { challenges } from '../data/datacache'
import * as utils from '../lib/utils'

// Проверка, что файл передан
function ensureFileIsPassed({ file }: Request, res: Response, next: NextFunction) {
  if (file != null) next()
  else res.status(400).json({ error: 'File is not passed' })
}

// Безопасная функция для zip
async function handleZipFileUpload({ file }: Request, res: Response, next: NextFunction) {
  if (!file || !file.originalname.toLowerCase().endsWith('.zip')) return next()

  if (!utils.isChallengeEnabled(challenges.fileWriteChallenge)) return res.status(204).end()

  try {
    const filename = path.basename(file.originalname.toLowerCase())
    const tempFile = path.join(os.tmpdir(), filename)
    await fs.writeFile(tempFile, file.buffer)

    const directory = path.resolve('uploads/complaints/')
    await fs.mkdir(directory, { recursive: true })

    const directorySafe = (filePath: string) => filePath.startsWith(directory)

    const zipStream = fs.createReadStream(tempFile).pipe(unzipper.Parse())
    zipStream.on('entry', async entry => {
      const fileName = path.basename(entry.path)
      const absolutePath = path.resolve(directory, fileName)
      challengeUtils.solveIf(challenges.fileWriteChallenge, () => absolutePath === path.resolve('ftp/legal.md'))

      if (directorySafe(absolutePath)) {
        entry.pipe(fs.createWriteStream(absolutePath))
      } else {
        entry.autodrain()
      }
    })
    zipStream.on('error', err => next(err))
    zipStream.on('close', () => res.status(204).end())

  } catch (err) {
    next(err)
  }
}

// Проверка размера файла
function checkUploadSize({ file }: Request, res: Response, next: NextFunction) {
  if (file != null) {
    challengeUtils.solveIf(challenges.uploadSizeChallenge, () => file.size > 100_000)
  }
  next()
}

// Проверка типа файла
function checkFileType({ file }: Request, res: Response, next: NextFunction) {
  if (!file) return next()
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '')
  const allowed = ['pdf', 'xml', 'zip', 'yml', 'yaml']
  challengeUtils.solveIf(challenges.uploadTypeChallenge, () => !allowed.includes(ext))
  next()
}

// Обработка XML без XXE
function handleXmlUpload({ file }: Request, res: Response, next: NextFunction) {
  if (!file || !file.originalname.toLowerCase().endsWith('.xml')) return next()
  challengeUtils.solveIf(challenges.deprecatedInterfaceChallenge, () => true)

  // Не используем `libxml.parseXml` с noent: true — потенциальный XXE
  res.status(410)
  next(new Error('B2B customer complaints via file upload have been deprecated for security reasons (' + file.originalname + ')'))
}

// Обработка YAML безопасно
function handleYamlUpload({ file }: Request, res: Response, next: NextFunction) {
  if (!file || (!file.originalname.toLowerCase().endsWith('.yml') && !file.originalname.toLowerCase().endsWith('.yaml'))) return next()
  challengeUtils.solveIf(challenges.deprecatedInterfaceChallenge, () => true)

  try {
    const data = file.buffer.toString()
    // Безопасная десериализация YAML
    yaml.load(data, { schema: yaml.FAILSAFE_SCHEMA })
  } catch (err) {
    // В случае ошибки можно отмечать challenge yamlBombChallenge
    if (challengeUtils.notSolved(challenges.yamlBombChallenge)) {
      challengeUtils.solve(challenges.yamlBombChallenge)
    }
  }

  res.status(410)
  next(new Error('B2B customer complaints via file upload have been deprecated for security reasons (' + file.originalname + ')'))
}

export {
  ensureFileIsPassed,
  handleZipFileUpload,
  checkUploadSize,
  checkFileType,
  handleXmlUpload,
  handleYamlUpload
}