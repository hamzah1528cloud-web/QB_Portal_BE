import { SetMetadata } from '@nestjs/common';

export const SKIP_RESULT_INTERCEPTOR = 'skipResultInterceptor';
export const SkipResultInterceptor = () => SetMetadata(SKIP_RESULT_INTERCEPTOR, true);
