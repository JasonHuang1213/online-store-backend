import { Request, Response, NextFunction } from 'express'

import Order from '../models/Order'
import OrderService from '../services/order'
import User from '../models/User'
import UserService from '../services/user'
import { BadRequestError, NotFoundError } from '../helpers/apiError'

// Get all orders with the same customer email (same buyer)
export const findOrdersByCustomerEmail = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const { customerEmail } = request.params
    const foundOrders = await OrderService.findOrdersByEmail(customerEmail)

    if (!foundOrders) {
      throw new NotFoundError(`Orders with ${customerEmail} not found`)
    }

    response.status(200).json(foundOrders)
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}

// Create an order
export const createOrder = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const {
      totalPrice,
      timestamp,
      customerEmail,
      purchasedItems,
      billingInfo,
    } = request.body

    const newOrder = new Order({
      totalPrice,
      timestamp,
      customerEmail,
      purchasedItems,
      billingInfo,
    })

    // Also need to add the order to user collections
    const user = await User.findOne({ email: customerEmail })
    if (!user) {
      throw new NotFoundError(
        'The user with email ' + customerEmail + ' does not exist'
      )
    }

    user.orders.push(newOrder._id)
    await UserService.saveUser(user)
    await OrderService.createOrder(newOrder)
    response.json(newOrder)
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}

export const deleteOrder = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = request.body

    const foundOrder = await OrderService.findOrderById(orderId)
    if (!foundOrder) {
      throw new NotFoundError('The order ' + foundOrder + ' does not exist')
    }

    // Also delete the order element in user orders array
    const customer = await User.findOne({ email: foundOrder.customerEmail })
    if (!customer) {
      throw new NotFoundError('The customer does not exist')
    }
    customer.orders.splice(customer.orders.indexOf(orderId), 1)

    await OrderService.deleteOrderById(orderId)
    await UserService.saveUser(customer)
    response.status(200).json(orderId)
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}
