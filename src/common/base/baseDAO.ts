import { ClientSession, Document, FilterQuery, Model } from 'mongoose';
import { CustomError } from '../errors/api.error';
import { ApiErrorCode } from '../enums/codes/api-error.enum';
import { ApiErrorSubCode } from '../enums/codes/api-error-subcode.enum';
import { HttpStatusCode } from '../enums/codes/http-error-code.enum';
import { DBSORT } from '../enums/sort.enum';

export interface PaginationMetadata {
  total: number;
  perPage: number;
  page: number;
  lastPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedData<T> {
  data: T[];
  metadata: PaginationMetadata;
}

export interface TransactionOptions {
  session?: ClientSession;
}

export abstract class BaseDAO<T extends Document, U> {
  protected constructor(protected readonly model: Model<T>) {}

  protected getConnection() {
    return this.model.db;
  }

  async startSession(): Promise<ClientSession> {
    return this.getConnection().startSession();
  }

  async withTransaction<X>(callback: (session: ClientSession) => Promise<X>): Promise<X> {
    const session = await this.startSession();
    try {
      session.startTransaction();
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async findById(id: string, options?: TransactionOptions): Promise<T | null> {
    const document = await this.model.findById(id).select('-__v').session(options?.session).lean().exec();
    if (!document) {
      throw new CustomError(`No document found with id ${id}`, HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    }
    const { _id, ...rest } = document as any;
    return { id: _id.toString(), ...rest } as unknown as T;
  }

  async create(data: Partial<U>, options?: TransactionOptions): Promise<T> {
    const res = await this.model.create([data], { session: options?.session });
    const { _id, __v, ...result } = res[0].toObject();
    (result as any).id = _id.toString();
    return result as unknown as T;
  }

  async updateById(id: string, update: Partial<U>, options?: TransactionOptions): Promise<T> {
    const document = await this.model
      .findByIdAndUpdate(id, { $set: update }, { new: true, session: options?.session })
      .select('-__v')
      .lean()
      .exec();
    if (!document) {
      throw new CustomError(`No document found with id ${id}`, HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    }
    const { _id, ...rest } = document as any;
    return { id: _id.toString(), ...rest } as unknown as T;
  }

  async remove(id: string, options?: TransactionOptions): Promise<string> {
    const existing = await this.model.findById(id).session(options?.session);
    if (!existing) {
      throw new CustomError(`No document found with id ${id}`, HttpStatusCode.NOT_FOUND, ApiErrorCode.GENERAL, ApiErrorSubCode.NOT_FOUND);
    }
    await this.model.findByIdAndDelete(id).session(options?.session);
    return id;
  }

  async find(
    filter: FilterQuery<T>,
    fields: string[],
    page: number = 1,
    perPage: number = 20,
    sort: Record<string, DBSORT> = { createdAt: DBSORT.DESC },
    options?: TransactionOptions,
  ): Promise<PaginatedData<U>> {
    const skip = (page - 1) * perPage;
    const select = fields.join(' ');
    const [data, total] = await Promise.all([
      this.model.find(filter).select(select).sort(sort as any).skip(skip).limit(perPage).session(options?.session).lean().exec(),
      this.model.countDocuments(filter).session(options?.session).exec(),
    ]);

    const lastPage = Math.ceil(total / perPage);
    return {
      data: data.map((d: any) => {
        const { _id, __v, ...rest } = d;
        return { id: _id.toString(), ...rest } as unknown as U;
      }),
      metadata: { total, perPage, page, lastPage, hasNext: page < lastPage, hasPrevious: page > 1 },
    };
  }

  async findOne(filter: FilterQuery<T>, options?: TransactionOptions): Promise<T | null> {
    const document = await this.model.findOne(filter).select('-__v').session(options?.session).lean().exec();
    if (!document) return null;
    const { _id, ...rest } = document as any;
    return { id: _id.toString(), ...rest } as unknown as T;
  }

  async upsert(filter: FilterQuery<T>, update: Partial<U>, options?: TransactionOptions): Promise<T> {
    const document = await this.model
      .findOneAndUpdate(filter, { $set: update }, { upsert: true, new: true, session: options?.session })
      .select('-__v')
      .lean()
      .exec();
    const { _id, ...rest } = document as any;
    return { id: _id.toString(), ...rest } as unknown as T;
  }
}
