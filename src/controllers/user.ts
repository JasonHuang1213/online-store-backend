import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import * as jwt from 'jsonwebtoken'
import _ from 'lodash'

import User from '../models/User'
import UserService from '../services/user'
import ProductService from '../services/product'
import CartItem from '../models/CartItem'
import Product, { ProductType } from '../models/Product'
import { BadRequestError, NotFoundError } from '../helpers/apiError'

dotenv.config()
const jwtKey: any = process.env.JWT_SECRET

// GET one user
export const getUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    //
    let user: any = req.user
    user = await UserService.getUser(user._id)
    res.status(200).send(user)
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}

// Get all
export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await UserService.getAll()
    res.status(200).send(users)
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}

// Update user
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.params.userId
    const update = req.body
    const updatedUser = await UserService.updateUser(userId, update)
    res.status(200).send(updatedUser)
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}

// register new user
export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password } = req.body
    let user = await User.findOne({ email: email })
    if (user) throw new BadRequestError('The user has already registered.')

    user = new User({ name, email, password })
    // bcrypt
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)

    await UserService.register(user)
    const token = jwt.sign({ _id: user._id }, jwtKey)
    res
      .header('x-auth-token', token)
      .status(201)
      .send(_.pick(user, ['name', 'email', '_id']))
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}

// Delete user
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.params.userId
    const deletedUser = await UserService.deleteUser(userId)
    res.status(200).send(deletedUser)
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}

// PATCH new cart item
export const addCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productName, email, quantity } = req.body
    const product = await Product.findOne({ name: productName })
    if (!product) throw new NotFoundError('The product does not exit.')

    const user = await User.findOne({ email: email })
    if (!user) throw new NotFoundError('The user does not exit.')

    const newItem = new CartItem({
      imageUrl: product.imageUrl,
      productName,
      price: product.price * quantity,
      quantity,
    })

    user.cart.push(newItem)
    await UserService.handleCartItem(user)
    res.send(newItem)
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}

// PATCH Increment cart item
export const incrementCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findOne({ email: req.body.email })
    if (!user) throw new NotFoundError('The user does not exit.')

    const cartItem = user.cart.find(
      (item) => item._id.toString() === req.body.itemId
    )
    if (!cartItem) throw new NotFoundError('The cart item does not exist.')

    const singlePrice = cartItem.price / cartItem.quantity
    cartItem.quantity++
    cartItem.price = cartItem.quantity * singlePrice
    await UserService.handleCartItem(user)
    res.send(cartItem)
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}

// PATCH Decrement cart item
export const decrementCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findOne({ email: req.body.email })
    if (!user) throw new NotFoundError('The user does not exit.')

    const cartItem = user.cart.find(
      (item) => item._id.toString() === req.body.itemId
    )
    if (!cartItem) throw new NotFoundError('The cart item does not exist.')

    const singlePrice = cartItem.price / cartItem.quantity
    cartItem.quantity--
    cartItem.price = cartItem.quantity * singlePrice
    await UserService.handleCartItem(user)
    res.send(cartItem)
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}

// DELETE delete a cart item
export const deleteCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findOne({ email: req.body.email })
    if (!user) throw new NotFoundError('The user does not exit.')

    const cartItem = user.cart.find(
      (item) => item._id.toString() === req.body.itemId
    )
    if (!cartItem) throw new NotFoundError('The cart item does not exist.')

    const index = user.cart.indexOf(cartItem)
    user.cart.splice(index, 1)
    await UserService.handleCartItem(user)
    res.send(cartItem)
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}

// PATCH new listing item
export const addListing = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { product, email } = req.body
    const { imageUrl, price, description, numberInStock, name, genre } = product
    const user = await User.findOne({ email: email })
    if (!user) throw new NotFoundError('The user does not exit.')

    const newListing = new Product({
      imageUrl,
      price,
      description,
      numberInStock,
      name,
      genre,
      owner: user._id,
    })

    user.listings.push(newListing)
    await UserService.handleListing(user)
    await ProductService.create(newListing)
    res.status(201).send(newListing)
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}

// DELETE a listing
export const removeListing = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productId, email } = req.body
    const product = await ProductService.findById(productId)
    if (!product) throw new NotFoundError('Product not found')

    const user = await User.findOne({ email: email })
    if (!user) throw new NotFoundError('The user does not exit.')

    const deletedListing = user.listings.find(
      (l) => l._id.toString() === productId
    )
    if (!deletedListing)
      throw new NotFoundError('The listing does not exist on this user.')
    const idx = user.listings.indexOf(deletedListing)
    user.listings.splice(idx, 1)

    await UserService.handleListing(user)
    await ProductService.deleteProduct(productId)
    res.send(deletedListing)
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}

// UPDATE a listing
export const updateListing = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productId, update, email } = req.body
    const product = await ProductService.findById(productId)
    if (!product) throw new NotFoundError('Product not found')

    const user = await User.findOne({ email: email })
    if (!user) throw new NotFoundError('The user does not exit.')

    const updatedListing = user.listings.find(
      (l) => l._id.toString() === productId
    )
    if (!updatedListing)
      throw new NotFoundError('the updatedListing does not exit.')
    const idx = user.listings.indexOf(updatedListing)

    // create a copy of updated listing and update value
    const newListing: any = _.merge(user.listings[idx], update)
    console.log(newListing)

    // Replace the old listing with new listing
    // user.listings.splice(idx, 1, newListing)
    user.listings[idx] = newListing

    await UserService.handleListing(user)
    await ProductService.update(productId, update)
    res.send(newListing)
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}
