using System.Collections.Concurrent;
using Microsoft.Extensions.Configuration;
using TODO.Database.Models.Core;

namespace TODO.Database.AccessLayer.Services.Implementations
{
    // Explicitly inherit and implement the ITODOListService interface
    public class TODOListMemoryService : ITODOListService
    {
        private const int DefaultMaxAllowedItems = 5000;
        private readonly ConcurrentDictionary<string, TODOList> _todos = new();
        private readonly int _maxAllowedItems;

        public TODOListMemoryService(IConfiguration configuration)
        {
            var configuredValue = configuration["TODOList:MaxAllowedItems"];
            _maxAllowedItems = int.TryParse(configuredValue, out var maxAllowedItems) && maxAllowedItems > 0
                ? maxAllowedItems
                : DefaultMaxAllowedItems;
        }

        public TODOList? GetItem(string title)
        {
            _todos.TryGetValue(title, out var item);
            return item;
        }

        public IEnumerable<TODOList> GetAll()
        {
            return _todos.Values.OrderByDescending(t => t.CreatedAt);
        }

        public string AddItem(TODOList tODOListItem)
        {
            if (_todos.Count >= _maxAllowedItems)
            {
                throw new TodoListFullException(_maxAllowedItems);
            }

            var item = tODOListItem;
            item.CreatedAt = DateTime.UtcNow;

            if (!_todos.TryAdd(item.Title, item))
            {
                throw new DuplicateTitleException(item.Title);
            }

            return item.Title;
        }
        public TODOList? UpdateItem(string title, TODOList updatedItem)
        {
            var item = GetItem(title);
            if (item != null)
            {
                item.Title = updatedItem.Title;
                item.Description = updatedItem.Description;
                item.Category = updatedItem.Category;
                item.Priority = updatedItem.Priority;
                item.IsCompleted = updatedItem.IsCompleted;

                if (!string.Equals(title, item.Title, StringComparison.Ordinal))
                {
                    _todos.TryRemove(title, out _);
                }
                _todos[item.Title] = item;
                return item;
            }
            return null;
        }

        public TODOList? ToggleStatus(string title)
        {
            var item = GetItem(title);
            if (item != null)
            {
                item.IsCompleted = !item.IsCompleted;
                return item;
            }
            return null;
        }

        public bool DeleteItem(string title)
        {
            return _todos.TryRemove(title, out _);
        }

        public bool ClearCompleted()
        {
            var completedTitles = _todos.Values.Where(t => t.IsCompleted).Select(t => t.Title);
            foreach (var title in completedTitles) DeleteItem(title);
            return true;
        }
    }
}
