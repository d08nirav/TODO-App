namespace TODO.Database.AccessLayer.Services
{
    /// <summary>
    /// Thrown when a TODO item cannot be added because the store has reached its configured capacity.
    /// </summary>
    public class TodoListFullException : InvalidOperationException
    {
        public TodoListFullException(int maxAllowedItems)
            : base($"The TODO list is full. A maximum of {maxAllowedItems} items is allowed.")
        {
            MaxAllowedItems = maxAllowedItems;
        }

        public int MaxAllowedItems { get; }
    }
}
