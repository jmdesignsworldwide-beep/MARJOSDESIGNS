import { z } from 'zod'

const money = z.coerce.number({ invalid_type_error: 'Monto inválido' }).finite().min(0).max(100_000_000)
const optStr = (max: number) => z.string().trim().max(max).optional().or(z.literal(''))

export const supplierSchema = z.object({
  name: z.string().trim().min(2, 'Escribe el nombre').max(120),
  phone: optStr(40),
  whatsapp: optStr(40),
  email: z.string().trim().email('Email inválido').max(120).optional().or(z.literal('')),
  address: optStr(200),
  contactPerson: optStr(120),
  notes: optStr(500),
  balanceOwed: money.optional(),
})
export const editSupplierSchema = supplierSchema.extend({ id: z.string().uuid() })

export const toggleSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['activo', 'inactivo']),
})

export const materialSchema = z.object({
  name: z.string().trim().min(2, 'Escribe el nombre').max(120),
  category: optStr(60),
  unit: z.string().trim().min(1).max(30).default('unidad'),
  defaultSupplierId: z.string().uuid().optional().or(z.literal('')),
  productId: z.string().uuid().optional().or(z.literal('')),
  unitCost: z.union([z.literal(''), money]).transform((v) => (v === '' ? null : v)),
  trackStock: z.coerce.boolean().optional(),
  stock: z.union([z.literal(''), money]).transform((v) => (v === '' ? null : v)),
  minStock: z.union([z.literal(''), money]).transform((v) => (v === '' ? null : v)),
})
export const editMaterialSchema = materialSchema.extend({ id: z.string().uuid() })

export const supplierPriceSchema = z.object({
  supplierId: z.string().uuid(),
  materialId: z.string().uuid(),
  price: money.refine((n) => n >= 0, 'Precio inválido'),
})

export const purchaseSchema = z.object({
  supplierId: z.string().uuid(),
  categoryId: z.string().uuid('Elige una categoría'),
  description: z.string().trim().min(2, 'Describe la compra').max(160),
  amount: money.refine((n) => n > 0, 'El monto debe ser mayor que 0'),
  method: z.enum(['efectivo', 'transferencia', 'debito', 'credito']),
  materialId: z.string().uuid().optional().or(z.literal('')),
})
