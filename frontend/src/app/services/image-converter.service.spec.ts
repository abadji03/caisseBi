import { TestBed } from '@angular/core/testing';

import { ImageConverterService } from './image-converter.service';

describe('ImageConverterService', () => {
  let service: ImageConverterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImageConverterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
