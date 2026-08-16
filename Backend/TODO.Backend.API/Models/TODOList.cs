using System.Text.Json.Serialization;

namespace TODO.Backend.API.Models
{
    public class TODOList
    {
        [JsonIgnore]
        public long Id { get; set; }

        public required string Title { get; set; }

        public string? Description { get; set; }

        public byte? CategoryId { get; set; }

        public Category Category { get; set; }

        public Priority Priority { get; set; }

        public bool IsCompleted { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
