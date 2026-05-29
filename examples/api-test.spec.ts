/**
 * Example: REST API Testing with Atomiq AI framework (Page Object Model).
 * Uses JSONPlaceholder (https://jsonplaceholder.typicode.com) as a live demo API.
 */
import { test, expect } from "../src/fixtures/enterprise-fixtures";
import { UsersApi } from "./pages/users-api.page";

test.describe("API Testing — REST Endpoints (POM)", () => {
  let usersApi: UsersApi;

  test.beforeEach(async ({ apiClient }) => {
    usersApi = new UsersApi(apiClient);
  });

  test("GET request with validation", async () => {
    await test.step("Fetch users list", async () => {
      const response = await usersApi.getAll();

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.duration).toBeLessThan(5000);
    });
  });

  test("POST request — create resource", async ({ dataGen }) => {
    const userData = {
      name: dataGen.randomName(),
      email: dataGen.randomEmail(),
      company: dataGen.randomCompany(),
    };

    await test.step("Create new user", async () => {
      const response = await usersApi.create(userData);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
    });
  });

  test("PUT request — update resource", async () => {
    await test.step("Update user", async () => {
      const response = await usersApi.update(1, { name: "Updated Name" });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });
  });

  test("DELETE request", async () => {
    await test.step("Delete user", async () => {
      const response = await usersApi.remove(1);
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });
  });

  test("API performance check", async () => {
    await test.step("Measure response time", async () => {
      const response = await usersApi.getById(1);
      expect(response.ok).toBe(true);
      expect(response.duration).toBeLessThan(3000);
    });
  });
});
