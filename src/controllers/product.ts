import { Request, Response, NextFunction } from 'express'

import Product from '../models/Product'
import ProductService from '../services/product'
import UserService from '../services/user'
import { BadRequestError, NotFoundError } from '../helpers/apiError'
import User from '../models/User'

// GET /products
export const findAll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.json(await ProductService.findAll())
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}

// POST /products
export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      imageUrl,
      name,
      price,
      description,
      genre,
      numberInStock,
      ownerEmail,
    } = req.body

    const foundOwner = await User.findOne({ email: ownerEmail })
    if (!foundOwner) throw new NotFoundError('the owner does not exist')

    const foundProduct = await Product.findOne({ name: name })
    if (foundProduct)
      throw new BadRequestError('the product with given name already exists')

    const product = new Product({
      imageUrl,
      name,
      price,
      description,
      genre,
      numberInStock,
      ownerEmail,
    })

    foundOwner.listings.push(product)
    await ProductService.create(product)
    await UserService.handleListing(foundOwner)
    res.json(product)
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}

// PUT /products/:productId
export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const update = req.body
    const productId = req.params.productId
    const updatedProduct = await ProductService.update(productId, update)
    res.json(updatedProduct)
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}

// DELETE /products/:productId
export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const foundProduct = await ProductService.deleteProduct(
      req.params.productId
    )
    if (!foundProduct) {
      throw new NotFoundError('The product does not exist')
    }

    // Also delete the listing in user listings
    const user = await User.findOne({ email: foundProduct.ownerEmail })
    if (!user) throw new NotFoundError('The user does not exit.')

    const deletedListing = user.listings.find(
      (l) => l._id.toString() === foundProduct._id.toString()
    )
    if (!deletedListing)
      throw new NotFoundError('The listing does not exist on this user.')
    const idx = user.listings.indexOf(deletedListing)
    user.listings.splice(idx, 1)

    await UserService.handleListing(user)

    res
      .status(200)
      .json({ msg: 'Successfully deleted!', deletedProduct: foundProduct })
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}

// GET /products/:productId
export const findById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.json(await ProductService.findById(req.params.productId))
  } catch (error) {
    if (error instanceof Error && error.name == 'ValidationError') {
      next(new BadRequestError('Invalid Request', error))
    } else {
      next(error)
    }
  }
}
