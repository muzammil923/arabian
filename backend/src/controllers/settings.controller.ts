import { Request, Response } from 'express'
import { asyncHandler } from '../utils/http'
import { buildWhatsAppUrl } from '../utils/whatsapp'
import {
  addStaff,
  createBranchFn,
  getBranches,
  getSettingsBundle,
  getStaff,
  modifyStaff,
  patchBranch,
  removeStaff,
  saveSettings,
} from '../services/settings.service'

export const settingsGet = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  res.json({ data: await getSettingsBundle(auth.businessId) })
})

export const settingsPatch = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  res.json({ data: await saveSettings(auth, req.body) })
})

export const staffList = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const includeInactive = req.query.include_inactive === 'true'
  res.json({ data: await getStaff(auth.businessId, includeInactive) })
})

export const staffCreate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  res.status(201).json({ data: await addStaff(auth, req.body) })
})

export const staffPatch = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  res.json({ data: await modifyStaff(auth, req.params.id, req.body) })
})

export const staffDelete = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  res.json({ data: await removeStaff(auth, req.params.id) })
})

export const branchList = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const includeInactive = req.query.include_inactive === 'true'
  res.json({ data: await getBranches(auth.businessId, includeInactive) })
})

export const branchCreate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  res.status(201).json({ data: await createBranchFn(auth, req.body) })
})

export const branchPatch = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  res.json({ data: await patchBranch(auth, req.params.id, req.body) })
})

export const whatsappBuild = asyncHandler(async (req: Request, res: Response) => {
  const phoneE164 = String(req.query.phone ?? '')
  const message = String(req.query.message ?? '')
  res.json({ data: { url: buildWhatsAppUrl(phoneE164, message) } })
})