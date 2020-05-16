import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    // TODO

    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found');
    }

    const foundProducts = await this.productsRepository.findAllById(
      products.map(product => ({ id: product.id })),
    );

    if (products.length !== foundProducts.length) {
      throw new AppError('Product not found');
    }

    products.forEach(product => {
      const quantityInDatabase = foundProducts.find(
        ({ id }) => id === product.id,
      )?.quantity;

      if ((quantityInDatabase || 0) < product.quantity) {
        throw new AppError('Invalid Quantity');
      }
    });

    const order = await this.ordersRepository.create({
      customer,
      products: products.map(product => ({
        product_id: product.id,
        price: foundProducts.find(({ id }) => id === product.id)?.price || 0,
        quantity: product.quantity,
      })),
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateProductService;
