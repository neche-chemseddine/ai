import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let tenantsService: TenantsService;

  const mockUsersService = {
    findOneByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockTenantsService = {
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: TenantsService, useValue: mockTenantsService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    tenantsService = module.get<TenantsService>(TenantsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should create a new tenant and user during registration', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        companyName: 'Test Corp',
      };

      mockUsersService.findOneByEmail.mockResolvedValue(null);
      mockTenantsService.create.mockResolvedValue({ id: 'tenant-123', name: 'Test Corp' });
      mockUsersService.create.mockImplementation((data) => ({
        id: 'user-123',
        ...data,
      }));

      const result = await service.register(userData);

      expect(mockTenantsService.create).toHaveBeenCalledWith('Test Corp');
      expect(mockUsersService.create).toHaveBeenCalled();
      expect(result.tenant_id).toBe('tenant-123');
      expect(result.email).toBe(userData.email);
    });

    it('should throw ConflictException if user already exists', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({ id: 'existing' });

      await expect(service.register({ email: 'exists@test.com' }))
        .rejects.toThrow(ConflictException);
    });
  });
});
