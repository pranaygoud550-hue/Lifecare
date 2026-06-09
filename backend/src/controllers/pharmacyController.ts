import { Request, Response } from 'express';
import { Medicine, Order, User, Notification } from '../models/index.js';
import { asyncHandler } from '../middleware/validate.js';
import { generateOrderId } from '../utils/helpers.js';
import { debitWallet } from '../services/walletService.js';
import { createNotification } from '../services/notificationService.js';

export const getMedicines = asyncHandler(async (req: Request, res: Response) => {
  const { search, category, form, page = '1', limit = '48', sort = 'name', order = 'asc' } = req.query;
  const filter: Record<string, unknown> = { isActive: true };

  if (category) filter.category = category;
  if (form) filter.form = form;

  if (search) {
    const term = (search as string).trim();
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { genericName: { $regex: term, $options: 'i' } },
      { brand: { $regex: term, $options: 'i' } },
      { manufacturer: { $regex: term, $options: 'i' } },
    ];
  }

  const sortDir = order === 'desc' ? -1 : 1;
  const sortOptions: Record<string, 1 | -1> = {};
  if (sort === 'price') sortOptions['pricing.sellingPrice'] = sortDir;
  else if (sort === 'discount') sortOptions['pricing.discount'] = -1;
  else if (sort === 'rating') sortOptions.rating = -1;
  else sortOptions.name = 1;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  const [medicines, total] = await Promise.all([
    Medicine.find(filter)
      .sort(sortOptions)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Medicine.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { medicines, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
  });
});

export const getMedicineById = asyncHandler(async (req: Request, res: Response) => {
  const medicine = await Medicine.findById(req.params.id).populate('substitutes');
  if (!medicine) {
    res.status(404).json({ success: false, message: 'Medicine not found' });
    return;
  }
  res.json({ success: true, data: medicine });
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { items, deliveryAddress, deliveryType = 'standard', paymentMethod } = req.body;

  let subtotal = 0;
  let prescriptionRequired = false;
  const orderItems = [];

  for (const item of items) {
    const medicine = await Medicine.findById(item.medicineId);
    if (!medicine || medicine.stock < item.quantity) {
      res.status(400).json({
        success: false,
        message: `Insufficient stock for ${medicine?.name || 'medicine'}`,
      });
      return;
    }
    if (medicine.prescriptionRequired) prescriptionRequired = true;
    const itemTotal = medicine.pricing.sellingPrice * item.quantity;
    subtotal += itemTotal;
    orderItems.push({
      medicineId: medicine._id,
      medicineName: medicine.name,
      quantity: item.quantity,
      price: medicine.pricing.sellingPrice,
      discount: medicine.pricing.discount || 0,
    });
  }

  const deliveryCharges =
    subtotal > 500 ? 0 : deliveryType === 'express' ? 99 : deliveryType === 'same-day' ? 149 : 49;
  const tax = subtotal * 0.05;
  const total = subtotal + deliveryCharges + tax;

  const pharmacy = await User.findOne({ userType: 'pharmacy', isActive: true });
  if (!pharmacy) {
    res.status(400).json({ success: false, message: 'No pharmacy available' });
    return;
  }

  if (paymentMethod === 'wallet') {
    await debitWallet(req.user!.userId, {
      type: 'debit',
      amount: total,
      description: 'Pharmacy order',
      category: 'pharmacy',
    });
  }

  const order = await Order.create({
    orderId: generateOrderId(),
    patientId: req.user!.userId,
    pharmacyId: pharmacy._id,
    items: orderItems,
    prescription: { required: prescriptionRequired, uploaded: false },
    deliveryAddress,
    pricing: { subtotal, discount: 0, deliveryCharges, tax, total },
    payment: {
      method: paymentMethod,
      status: paymentMethod === 'wallet' ? 'paid' : paymentMethod === 'cod' ? 'pending' : 'pending',
      transactionId: paymentMethod === 'wallet' ? `wallet-${Date.now()}` : undefined,
      timestamp: paymentMethod === 'wallet' ? new Date() : undefined,
    },
    delivery: {
      type: deliveryType,
      currentStatus: paymentMethod === 'wallet' ? 'confirmed' : 'pending',
      statusHistory: [
        { status: paymentMethod === 'wallet' ? 'confirmed' : 'pending', timestamp: new Date() },
      ],
    },
  });

  for (const item of items) {
    await Medicine.findByIdAndUpdate(item.medicineId, { $inc: { stock: -item.quantity } });
  }

  if (paymentMethod === 'wallet') {
    await createNotification({
      userId: req.user!.userId,
      type: 'order',
      title: 'Order confirmed',
      message: `Your pharmacy order ${order.orderId} has been placed successfully.`,
      data: { orderId: order._id.toString() },
    });
  }

  res.status(201).json({ success: true, data: order });
});

export const getOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await Order.find({ patientId: req.user!.userId })
    .sort({ createdAt: -1 })
    .populate('items.medicineId');
  res.json({ success: true, data: orders });
});

export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }
  if (order.patientId.toString() !== req.user!.userId && req.user!.userType !== 'admin') {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }
  res.json({ success: true, data: order });
});

export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }

  if (order.patientId.toString() !== req.user!.userId && req.user!.userType !== 'admin') {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  if (!['pending', 'confirmed'].includes(order.delivery.currentStatus)) {
    res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });
    return;
  }

  order.delivery.currentStatus = 'cancelled';
  order.delivery.statusHistory?.push({ status: 'cancelled', timestamp: new Date() });
  await order.save();

  for (const item of order.items) {
    await Medicine.findByIdAndUpdate(item.medicineId, { $inc: { stock: item.quantity } });
  }

  res.json({ success: true, data: order });
});
