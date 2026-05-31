import { Global, Module } from '@nestjs/common';
import { QuickBooksClient } from './quickbooks.client';

@Global()
@Module({
  providers: [QuickBooksClient],
  exports: [QuickBooksClient],
})
export class QuickBooksModule {}
