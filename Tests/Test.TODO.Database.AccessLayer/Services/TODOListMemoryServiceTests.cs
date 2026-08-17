using Microsoft.Extensions.Configuration;
using Moq;
using TODO.Database.AccessLayer.Services.Implementations;
using TODO.Database.Models.Core;
using TODO.Database.Models.Static;

namespace Test.TODO.Database.AccessLayer.Services
{
    [TestFixture]
    public class TODOListMemoryServiceTests
    {
        private static TODOListMemoryService CreateService(int? maxAllowedItems = null, string? rawValue = null)
        {
            var configuration = new Mock<IConfiguration>();
            var configuredValue = rawValue ?? maxAllowedItems?.ToString();
            configuration.Setup(c => c["TODOList:MaxAllowedItems"]).Returns(configuredValue!);
            return new TODOListMemoryService(configuration.Object);
        }

        private static TODOList CreateTodo(
            string title,
            string? description = null,
            Category category = Category.None,
            Priority priority = Priority.None,
            bool isCompleted = false)
        {
            return new TODOList
            {
                Title = title,
                Description = description,
                Category = category,
                Priority = priority,
                IsCompleted = isCompleted
            };
        }

        #region Constructor
        // Honors a valid positive configuration value as the capacity limit.
        [Test]
        public void Constructor_UsesConfiguredMaxAllowedItems_WhenValuePositive()
        {
            var service = CreateService(maxAllowedItems: 2);

            service.AddItem(CreateTodo("A"));
            service.AddItem(CreateTodo("B"));

            var ex = Assert.Throws<InvalidOperationException>(() => service.AddItem(CreateTodo("C")));
            Assert.That(ex!.Message, Is.EqualTo("Todo List full."));
        }

        // Falls back to the default capacity when the config value is missing.
        [Test]
        public void Constructor_FallsBackToDefault_WhenConfigValueMissing()
        {
            var service = CreateService(maxAllowedItems: null);

            Assert.DoesNotThrow(() => service.AddItem(CreateTodo("A")));
        }

        // Falls back to the default capacity when the config value is invalid.
        [TestCase("not-a-number")]
        [TestCase("")]
        [TestCase("0")]
        [TestCase("-5")]
        public void Constructor_FallsBackToDefault_WhenConfigValueInvalid(string rawValue)
        {
            var service = CreateService(rawValue: rawValue);

            Assert.DoesNotThrow(() => service.AddItem(CreateTodo("A")));
        }
        #endregion

        #region AddItem
        // Returns the stored item's title and makes it retrievable.
        [Test]
        public void AddItem_ReturnsTitle_AndStoresItem()
        {
            var service = CreateService();
            var todo = CreateTodo("Buy milk", description: "2 litres");

            var returnedTitle = service.AddItem(todo);

            Assert.That(returnedTitle, Is.EqualTo("Buy milk"));
            Assert.That(service.GetItem("Buy milk"), Is.SameAs(todo));
        }

        // Stamps CreatedAt with the current UTC time.
        [Test]
        public void AddItem_SetsCreatedAtToUtcNow()
        {
            var service = CreateService();
            var before = DateTime.UtcNow;

            service.AddItem(CreateTodo("Task"));

            var after = DateTime.UtcNow;
            var stored = service.GetItem("Task");
            Assert.That(stored, Is.Not.Null);
            Assert.That(stored!.CreatedAt, Is.InRange(before, after));
        }

        // Overwrites the existing item when the title is duplicated.
        [Test]
        public void AddItem_OverwritesExistingItem_WhenTitleDuplicated()
        {
            var service = CreateService();
            service.AddItem(CreateTodo("Dup", description: "first"));
            service.AddItem(CreateTodo("Dup", description: "second"));

            var all = service.GetAll().ToList();
            Assert.That(all, Has.Count.EqualTo(1));
            Assert.That(all[0].Description, Is.EqualTo("second"));
        }

        // Throws InvalidOperationException when capacity is reached.
        [Test]
        public void AddItem_Throws_WhenCapacityReached()
        {
            var service = CreateService(maxAllowedItems: 1);
            service.AddItem(CreateTodo("Only"));

            var ex = Assert.Throws<InvalidOperationException>(() => service.AddItem(CreateTodo("Overflow")));
            Assert.That(ex!.Message, Is.EqualTo("Todo List full."));
        }
        #endregion

        #region GetItem / GetAll
        // Returns null when no item with the given title exists.
        [Test]
        public void GetItem_ReturnsNull_WhenTitleNotFound()
        {
            var service = CreateService();

            Assert.That(service.GetItem("missing"), Is.Null);
        }

        // Returns the exact stored item when the title exists.
        [Test]
        public void GetItem_ReturnsItem_WhenTitleExists()
        {
            var service = CreateService();
            var todo = CreateTodo("Present");
            service.AddItem(todo);

            Assert.That(service.GetItem("Present"), Is.SameAs(todo));
        }

        // Returns an empty sequence when the store contains no items.
        [Test]
        public void GetAll_ReturnsEmpty_WhenNoItems()
        {
            var service = CreateService();

            Assert.That(service.GetAll(), Is.Empty);
        }

        // Returns items ordered by CreatedAt descending (newest first).
        [Test]
        public void GetAll_ReturnsItemsOrderedByCreatedAtDescending()
        {
            var service = CreateService();
            service.AddItem(CreateTodo("Oldest"));
            System.Threading.Thread.Sleep(5);
            service.AddItem(CreateTodo("Middle"));
            System.Threading.Thread.Sleep(5);
            service.AddItem(CreateTodo("Newest"));

            var titles = service.GetAll().Select(t => t.Title).ToList();

            Assert.That(titles, Is.EqualTo(new[] { "Newest", "Middle", "Oldest" }));
        }
        #endregion

        #region UpdateItem
        // UpdateItem returns null when the target title does not exist.
        [Test]
        public void UpdateItem_ReturnsNull_WhenTitleNotFound()
        {
            var service = CreateService();

            var result = service.UpdateItem("missing", CreateTodo("missing"));

            Assert.That(result, Is.Null);
        }

        // Copies the mutable fields onto the existing item and returns it.
        [Test]
        public void UpdateItem_UpdatesMutableFields_WhenTitleExists()
        {
            var service = CreateService();
            service.AddItem(CreateTodo("Task", description: "old", category: Category.Personal, priority: Priority.Low));

            var updated = service.UpdateItem("Task", CreateTodo(
                "Task",
                description: "new",
                category: Category.Work,
                priority: Priority.High,
                isCompleted: true));

            Assert.That(updated, Is.Not.Null);
            Assert.That(updated!.Description, Is.EqualTo("new"));
            Assert.That(updated.Category, Is.EqualTo(Category.Work));
            Assert.That(updated.Priority, Is.EqualTo(Priority.High));
            Assert.That(updated.IsCompleted, Is.True);
        }

        // Re-indexes the item under the new title when the title changes.
        [Test]
        public void UpdateItem_ChangingTitle_ReindexesUnderNewTitle()
        {
            var service = CreateService();
            service.AddItem(CreateTodo("Old Title"));

            service.UpdateItem("Old Title", CreateTodo("New Title"));

            Assert.Multiple(() =>
            {
                Assert.That(service.GetItem("New Title"), Is.Not.Null, "Item should be retrievable by its new title.");
                Assert.That(service.GetItem("Old Title"), Is.Null, "Item should no longer be retrievable by its old title.");
            });
        }
        #endregion

        #region ToggleStatus
        // Returns null when the target title does not exist.
        [Test]
        public void ToggleStatus_ReturnsNull_WhenTitleNotFound()
        {
            var service = CreateService();

            Assert.That(service.ToggleStatus("missing"), Is.Null);
        }

        // Flips an incomplete item to complete.
        [Test]
        public void ToggleStatus_FlipsIncompleteToComplete()
        {
            var service = CreateService();
            service.AddItem(CreateTodo("Task", isCompleted: false));

            var result = service.ToggleStatus("Task");

            Assert.That(result, Is.Not.Null);
            Assert.That(result!.IsCompleted, Is.True);
        }

        // Flips a completed item back to incomplete.
        [Test]
        public void ToggleStatus_FlipsCompleteToIncomplete()
        {
            var service = CreateService();
            service.AddItem(CreateTodo("Task", isCompleted: true));

            var result = service.ToggleStatus("Task");

            Assert.That(result, Is.Not.Null);
            Assert.That(result!.IsCompleted, Is.False);
        }
        #endregion

        #region DeleteItem
        // Removes an existing item and returns true.
        [Test]
        public void DeleteItem_RemovesItem_AndReturnsTrue_WhenExists()
        {
            var service = CreateService();
            service.AddItem(CreateTodo("Task"));

            var result = service.DeleteItem("Task");

            Assert.That(result, Is.True);
            Assert.That(service.GetItem("Task"), Is.Null);
        }

        // Returns false when the title does not exist.
        [Test]
        public void DeleteItem_ReturnsFalse_WhenNotFound()
        {
            var service = CreateService();

            Assert.That(service.DeleteItem("missing"), Is.False);
        }
        #endregion

        #region ClearCompleted
        // Removes only completed items, keeping incomplete ones intact.
        [Test]
        public void ClearCompleted_RemovesOnlyCompletedItems()
        {
            var service = CreateService();
            service.AddItem(CreateTodo("Done1", isCompleted: true));
            service.AddItem(CreateTodo("Pending", isCompleted: false));
            service.AddItem(CreateTodo("Done2", isCompleted: true));

            var result = service.ClearCompleted();

            var remaining = service.GetAll().Select(t => t.Title).ToList();
            Assert.That(result, Is.True);
            Assert.That(remaining, Is.EqualTo(new[] { "Pending" }));
        }

        // Returns true and is a no-op when there are no completed items.
        [Test]
        public void ClearCompleted_ReturnsTrue_AndKeepsAll_WhenNoCompletedItems()
        {
            var service = CreateService();
            service.AddItem(CreateTodo("A"));
            service.AddItem(CreateTodo("B"));

            var result = service.ClearCompleted();

            Assert.That(result, Is.True);
            Assert.That(service.GetAll().Count(), Is.EqualTo(2));
        }

        // Returns true even when the store is empty.
        [Test]
        public void ClearCompleted_ReturnsTrue_WhenEmpty()
        {
            var service = CreateService();

            Assert.That(service.ClearCompleted(), Is.True);
        }
        #endregion
    }
}