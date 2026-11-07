import { TestBed } from '@angular/core/testing';
import { FirebaseApp, provideFirebaseApp } from '@angular/fire/app';
import { getApp, initializeApp } from 'firebase/app';

describe('Node runner spike', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('loads the built library with one firebase/app registry', () => {
    TestBed.configureTestingModule({
      providers: [provideFirebaseApp(() => initializeApp({ apiKey: 'spike', projectId: 'spike', appId: '1:1:web:spike' }, 'spike'))],
    });
    expect(TestBed.inject(FirebaseApp)).toBe(getApp('spike'));
  });
});
